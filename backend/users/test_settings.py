from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import AuditLog
from users.models import Plan, User
from users.serializers import LoginSerializer


class AccountSettingsTests(TestCase):
    password = "OriginalSafe456!"
    new_password = "UpdatedSecret789!"

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            "settings@example.com", self.password,
            first_name="Ana", last_name="López", is_email_verified=True,
        )
        self.other_user = User.objects.create_user("other-settings@example.com", "OtherSafe123!", is_email_verified=True)
        self.client = APIClient()
        self.token = self.authenticate(self.user)

    def authenticate(self, user):
        token = LoginSerializer.get_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
        return token

    def change_password(self, **changes):
        return self.client.post("/api/auth/password-change/", {
            "current_password": self.password,
            "password": self.new_password,
            "password_confirm": self.new_password,
            **changes,
        }, format="json")

    def test_all_roles_can_update_their_own_name_without_changing_role_or_plan(self):
        paid_plan = Plan.objects.get(code="pro")
        for role in User.Role.values:
            with self.subTest(role=role):
                user = User.objects.create_user(f"settings-{role}@example.com", self.password,
                    role=role, plan=paid_plan, is_email_verified=True)
                original_plan = user.plan_id
                self.authenticate(user)
                response = self.client.patch("/api/auth/me/", {
                    "first_name": "  Nombre  ", "last_name": "  Apellido  ",
                }, format="json")
                self.assertEqual(response.status_code, 200, response.data)
                user.refresh_from_db()
                self.assertEqual(user.first_name, "Nombre")
                self.assertEqual(user.last_name, "Apellido")
                self.assertEqual(user.role, role)
                self.assertEqual(user.plan_id, original_plan)
                self.assertTrue(user.is_email_verified)
                self.assertEqual(response.data["user"]["id"], user.pk)
                self.assertNotIn("password", response.data["user"])
                profile = self.client.get("/api/auth/me/")
                self.assertEqual(profile.status_code, 200)
                self.assertEqual(profile.data["first_name"], "Nombre")
                event = AuditLog.objects.get(actor=user, action="auth.profile_updated")
                self.assertEqual(event.details, {"fields": ["first_name", "last_name"]})

    def test_partial_profile_update_preserves_other_fields_and_accounts(self):
        response = self.client.patch("/api/auth/me/", {"first_name": "Lucía"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.other_user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Lucía")
        self.assertEqual(self.user.last_name, "López")
        self.assertEqual(self.user.email, "settings@example.com")
        self.assertTrue(self.user.check_password(self.password))
        self.assertEqual(self.other_user.first_name, "")

    def test_optional_names_can_be_cleared(self):
        response = self.client.patch("/api/auth/me/", {"last_name": "  "}, format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.last_name, "")

    def test_profile_cannot_change_permissions_email_password_or_another_user(self):
        for key, value in (
            ("role", "ADMIN"), ("plan", 2), ("pending_plan", 2), ("is_staff", True),
            ("is_superuser", True), ("is_email_verified", False), ("is_active", False),
            ("email", "hijacked@example.com"), ("password", self.new_password), ("id", self.other_user.pk),
        ):
            with self.subTest(key=key):
                response = self.client.patch("/api/auth/me/", {"first_name": "Should not save", key: value}, format="json")
                self.assertEqual(response.status_code, 400, response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Ana")
        self.assertEqual(self.user.role, "CLIENT")
        self.assertEqual(self.user.plan.code, "free")
        self.assertTrue(self.user.check_password(self.password))
        self.assertFalse(AuditLog.objects.filter(action="auth.profile_updated").exists())

    def test_invalid_or_empty_profile_updates_are_rejected(self):
        for payload in ({}, {"first_name": "a" * 151}, {"last_name": None}):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.patch("/api/auth/me/", payload, format="json").status_code, 400)

    def test_settings_require_authentication(self):
        self.client.credentials()
        self.assertEqual(self.client.patch("/api/auth/me/", {"first_name": "Unauthorized"}, format="json").status_code, 401)
        self.assertEqual(self.change_password().status_code, 401)

    def test_password_change_revokes_previous_sessions_and_accepts_new_login(self):
        second_session = LoginSerializer.get_token(self.user)
        other_session = LoginSerializer.get_token(self.other_user)
        response = self.change_password()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn(self.new_password, str(response.data))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))
        self.assertFalse(self.user.check_password(self.password))
        self.assertTrue(self.user.is_email_verified)
        self.assertEqual(self.user.plan.code, "free")
        for token in (self.token, second_session):
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
            self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
            self.assertEqual(self.client.post("/api/auth/token/refresh/", {"refresh": str(token)}, format="json").status_code, 401)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/login/", {"email": self.user.email, "password": self.password}, format="json").status_code, 401)
        login = self.client.post("/api/auth/login/", {"email": self.user.email, "password": self.new_password}, format="json")
        self.assertEqual(login.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_session.access_token}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        event = AuditLog.objects.get(action="auth.password_changed")
        self.assertEqual(event.actor, self.user)
        self.assertEqual(event.details, {})

    def test_password_change_works_for_admin_and_support_without_assigning_a_plan(self):
        for role in ("ADMIN", "SUPPORT"):
            with self.subTest(role=role):
                user = User.objects.create_user(f"password-{role}@example.com", self.password, role=role, is_email_verified=True)
                self.authenticate(user)
                self.assertEqual(self.change_password().status_code, 200)
                user.refresh_from_db()
                self.assertTrue(user.check_password(self.new_password))
                self.assertIsNone(user.plan)
                self.assertEqual(user.role, role)

    def test_invalid_password_changes_do_not_alter_credentials_or_session(self):
        for changes, field in (
            ({"current_password": "wrong-password"}, "current_password"),
            ({"password_confirm": "AnotherPassword123!"}, "password_confirm"),
            ({"password": "12345678", "password_confirm": "12345678"}, "password"),
            ({"password": "short", "password_confirm": "short"}, "password"),
            ({"password": self.password, "password_confirm": self.password}, "password"),
        ):
            with self.subTest(changes=changes):
                response = self.change_password(**changes)
                self.assertEqual(response.status_code, 400, response.data)
                self.assertIn(field, response.data)
                self.user.refresh_from_db()
                self.assertTrue(self.user.check_password(self.password))
                self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        self.assertFalse(AuditLog.objects.filter(action="auth.password_changed").exists())

    def test_password_policy_checks_similarity_to_account_identity(self):
        self.user.first_name = "SimilarUniqueName"
        self.user.save(update_fields=["first_name"])
        response = self.change_password(password="SimilarUniqueName", password_confirm="SimilarUniqueName")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_password_endpoint_never_changes_a_different_account(self):
        response = self.change_password(user_id=self.other_user.pk, role="ADMIN", plan=2)
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.other_user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))
        self.assertEqual(self.user.role, "CLIENT")
        self.assertTrue(self.other_user.check_password("OtherSafe123!"))

    def test_current_password_attempts_are_limited_per_user(self):
        for _ in range(10):
            self.assertEqual(self.change_password(current_password="wrong").status_code, 400)
        self.assertEqual(self.change_password(current_password="wrong").status_code, 429)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.password))

    @patch("users.account_views.record_audit_event", side_effect=RuntimeError("audit unavailable"))
    def test_password_change_is_rolled_back_if_save_cannot_finish(self, record_event):
        with self.assertRaises(RuntimeError):
            self.change_password()
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.password))
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
