from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import AuditLog
from plans.models import Subscription
from users.models import User


class SupportUserCreationTests(TestCase):
    url = "/api/auth/management/support/"

    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user(
            "admin-support@example.com", "AdminPass123!",
            role=User.Role.ADMIN, is_email_verified=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.payload = {
            "first_name": "Ana", "last_name": "López", "email": "Support@Example.com",
            "password": "SecureSupport456!", "password_confirm": "SecureSupport456!",
        }

    def create_support(self, **changes):
        return self.client.post(self.url, {**self.payload, **changes}, format="json")

    def test_admin_creates_active_support_with_hashed_password_and_audit(self):
        response = self.create_support()
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(email="support@example.com")
        self.assertEqual(user.role, User.Role.SUPPORT)
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_verified)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.plan.code, "free")
        self.assertIsNone(user.pending_plan)
        self.assertTrue(user.check_password(self.payload["password"]))
        self.assertNotEqual(user.password, self.payload["password"])
        self.assertEqual(user.subscription.status, "ACTIVE")
        self.assertIsNone(user.subscription.end_date)
        self.assertEqual(response.data["user"]["id"], user.pk)
        self.assertNotIn("password", response.data["user"])
        self.assertNotIn("password_confirm", response.data["user"])
        event = AuditLog.objects.get(action="user.support_created")
        self.assertEqual(event.actor, self.admin)
        self.assertEqual(event.resource_id, str(user.pk))
        self.assertEqual(event.details, {"role": "SUPPORT"})
        self.assertEqual(len(mail.outbox), 0)

    def test_new_account_can_login_and_only_use_support_permissions(self):
        self.assertEqual(self.create_support().status_code, 201)
        client_user = User.objects.create_user("client-support@example.com")
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/auth/login/", {
            "email": "SUPPORT@EXAMPLE.COM", "password": self.payload["password"],
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["user"]["role"], "SUPPORT")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        users = self.client.get("/api/auth/management/users/")
        self.assertEqual(users.status_code, 200)
        self.assertEqual([user["id"] for user in users.data], [client_user.pk])
        self.assertEqual(self.create_support(email="second-support@example.com").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/plans/").status_code, 403)
        self.assertEqual(self.client.get("/api/admin/audit/").status_code, 403)
        response = self.client.patch(f"/api/auth/management/{client_user.pk}/status/", {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_anonymous_clients_and_support_cannot_create_support(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.create_support().status_code, 401)
        for role in (User.Role.CLIENT, User.Role.SUPPORT):
            with self.subTest(role=role):
                user = User.objects.create_user(f"{role}@example.com", role=role, is_staff=True)
                self.client.force_authenticate(user)
                self.assertEqual(self.create_support().status_code, 403)
        self.assertFalse(User.objects.filter(email="support@example.com").exists())
        self.assertFalse(AuditLog.objects.filter(action="user.support_created").exists())

    def test_payload_cannot_assign_administrator_or_django_privileges(self):
        response = self.create_support(
            role="ADMIN", is_staff=True, is_superuser=True,
            is_active=False, is_email_verified=False, plan_code="business",
            groups=[1], user_permissions=[1],
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="support@example.com")
        self.assertEqual(user.role, "SUPPORT")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.groups.exists())
        self.assertFalse(user.user_permissions.exists())
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_verified)
        self.assertEqual(user.plan.code, "free")

    def test_invalid_identity_and_passwords_do_not_create_accounts(self):
        for changes, field in (
            ({"first_name": "   "}, "first_name"),
            ({"last_name": ""}, "last_name"),
            ({"email": "invalid"}, "email"),
            ({"password_confirm": "DifferentPass123!"}, "password_confirm"),
            ({"password": "12345678", "password_confirm": "12345678"}, "password"),
            ({"password": "short", "password_confirm": "short"}, "password"),
            ({"first_name": "SecureSupport456!"}, "password"),
        ):
            with self.subTest(changes=changes):
                response = self.create_support(**changes)
                self.assertEqual(response.status_code, 400, response.data)
                self.assertIn(field, response.data)
                self.assertEqual(User.objects.count(), 1)
        self.assertFalse(Subscription.objects.exists())
        self.assertFalse(AuditLog.objects.exists())

    def test_duplicate_email_is_rejected_without_changing_existing_user(self):
        existing = User.objects.create_user("SUPPORT@example.com", "OriginalPass123!")
        response = self.create_support(email=" support@EXAMPLE.com ")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        existing.refresh_from_db()
        self.assertEqual(existing.role, "CLIENT")
        self.assertTrue(existing.check_password("OriginalPass123!"))
        self.assertEqual(User.objects.filter(email__iexact="support@example.com").count(), 1)

    def test_repeated_submission_does_not_create_duplicate_account_or_audit(self):
        self.assertEqual(self.create_support().status_code, 201)
        self.assertEqual(self.create_support().status_code, 400)
        self.assertEqual(User.objects.filter(role="SUPPORT").count(), 1)
        self.assertEqual(AuditLog.objects.filter(action="user.support_created").count(), 1)

    def test_public_registration_cannot_create_support(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/auth/register/", {
            **self.payload, "role": "SUPPORT", "is_staff": True, "is_email_verified": True,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="support@example.com")
        self.assertEqual(user.role, "CLIENT")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_email_verified)

    @patch("users.views.record_audit_event", side_effect=RuntimeError("audit unavailable"))
    def test_failed_creation_rolls_back_account_and_subscription(self, record_event):
        with self.assertRaises(RuntimeError):
            self.create_support()
        self.assertFalse(User.objects.filter(role="SUPPORT").exists())
        self.assertFalse(Subscription.objects.exists())
