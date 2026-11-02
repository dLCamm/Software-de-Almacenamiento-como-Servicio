from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from payments.models import Payment
from plans.entitlements import PlanFeatureUnavailable, get_user_features
from plans.models import Subscription
from storage.models import Archivo
from storage.services.file_service import FileService
from users.models import Plan, User


class InternalAccountTests(TestCase):
    def setUp(self):
        self.free = Plan.objects.get(code="free")
        self.pro = Plan.objects.get(code="pro")
        self.admin = User.objects.create_user("internal-admin@example.com", role="ADMIN", is_email_verified=True)
        self.support = User.objects.create_user("internal-support@example.com", role="SUPPORT", is_email_verified=True)
        self.customer = User.objects.create_user("internal-client@example.com", plan=self.pro, pending_plan=self.pro)
        self.client = APIClient()

    def test_internal_creation_clears_plans_even_if_explicitly_supplied(self):
        for role in ("ADMIN", "SUPPORT"):
            with self.subTest(role=role):
                user = User.objects.create_user(f"explicit-{role}@example.com", role=role, plan=self.pro, pending_plan=self.pro)
                self.assertIsNone(user.plan_id)
                self.assertIsNone(user.pending_plan_id)
                self.assertFalse(Subscription.objects.filter(user=user).exists())
        superuser = User.objects.create_superuser("superuser-internal@example.com", "SecurePass123!")
        self.assertIsNone(superuser.plan_id)
        customer = User.objects.create_user("free-client@example.com")
        self.assertEqual(customer.plan, self.free)

    def test_internal_accounts_do_not_need_a_free_plan_to_be_created(self):
        with patch("users.models.Plan.objects.get", side_effect=AssertionError("No plan lookup for internal roles")):
            user = User.objects.create_user("no-plan-lookup@example.com", role="SUPPORT")
        self.assertIsNone(user.plan)

    def test_database_rejects_plans_for_internal_accounts_and_planless_clients(self):
        for user in (self.admin, self.support):
            for changes in ({"plan": self.pro}, {"pending_plan": self.pro}):
                with self.subTest(role=user.role, changes=changes), self.assertRaises(IntegrityError), transaction.atomic():
                    User.objects.filter(pk=user.pk).update(**changes)
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.filter(pk=self.customer.pk).update(plan=None)

    def test_internal_profile_and_management_detail_report_null_plan_and_subscription(self):
        for user in (self.admin, self.support):
            self.client.force_authenticate(user)
            profile = self.client.get("/api/auth/me/")
            self.assertEqual(profile.status_code, 200)
            self.assertIsNone(profile.data["plan"])
            self.assertIsNone(profile.data["pending_plan"])
            self.client.force_authenticate(self.admin)
            detail = self.client.get(f"/api/auth/management/{user.pk}/")
            self.assertIsNone(detail.data["plan"])
            self.assertIsNone(detail.data["subscription"])

    @patch("payments.views.MockPaymentGateway.process_payment")
    def test_internal_accounts_cannot_access_personal_billing_or_process_payments(self, gateway):
        for user in (self.admin, self.support):
            self.client.force_authenticate(user)
            for url in ("/api/plans/current/", "/api/subscription/current/", "/api/payments/history/"):
                with self.subTest(role=user.role, url=url):
                    self.assertEqual(self.client.get(url).status_code, 403)
            payload = {"plan_id": self.pro.pk, "card": {"card_number": "0000000000000000", "expiry": "12/30", "cvv": "123"}}
            for url in ("/api/payments/change-plan/", "/api/payments/renew/"):
                with self.subTest(role=user.role, url=url):
                    self.assertEqual(self.client.post(url, payload, format="json").status_code, 403)
            self.assertEqual(get_user_features(user), {"temporary_files": False, "share_links": False})
        gateway.assert_not_called()
        self.assertFalse(Payment.objects.exists())
        self.assertFalse(Subscription.objects.exists())

    def test_every_storage_endpoint_rejects_internal_accounts(self):
        item_id = uuid4()
        endpoints = [
            ("get", "files/"), ("post", "files/upload/"),
            ("get", f"files/{item_id}/"), ("patch", f"files/{item_id}/"),
            ("delete", f"files/{item_id}/"), ("get", f"files/{item_id}/download/"),
            ("post", f"files/{item_id}/share/"), ("post", f"files/{item_id}/restore/"),
            ("get", "folders/"), ("post", "folders/"),
            ("patch", f"folders/{item_id}/"), ("delete", f"folders/{item_id}/"),
            ("post", f"folders/{item_id}/restore/"), ("get", "usage/"), ("get", "trash/"),
        ]
        for user in (self.admin, self.support):
            self.client.force_authenticate(user)
            for method, suffix in endpoints:
                with self.subTest(role=user.role, method=method, suffix=suffix):
                    response = getattr(self.client, method)(f"/api/storage/{suffix}")
                    self.assertEqual(response.status_code, 403)
            with self.assertRaises(PlanFeatureUnavailable):
                FileService.get_user_storage_usage(user)

    def test_promoting_client_cancels_subscription_and_preserves_files_and_payments(self):
        subscription = Subscription.objects.create(user=self.customer, end_date=timezone.now() + timedelta(days=30), auto_renew=True)
        payment = Payment.objects.create(user=self.customer, plan=self.pro, amount=149, payment_type="SUBSCRIPTION", status="APPROVED", payment_method="MOCK_CARD", transaction_reference="internal-role-change")
        stored_file = Archivo.objects.create(usuario=self.customer, nombre_original="saved.pdf", extension="pdf", mime_type="application/pdf", tamano_bytes=10, bucket_minio="test", object_key="saved.pdf")
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/auth/management/{self.customer.pk}/edit/", {"role": "SUPPORT"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        subscription.refresh_from_db()
        self.assertIsNone(self.customer.plan_id)
        self.assertIsNone(self.customer.pending_plan_id)
        self.assertEqual(subscription.status, "CANCELLED")
        self.assertFalse(subscription.auto_renew)
        self.assertTrue(Payment.objects.filter(pk=payment.pk).exists())
        self.assertTrue(Archivo.objects.filter(pk=stored_file.pk).exists())
        detail = self.client.get(f"/api/auth/management/{self.customer.pk}/")
        self.assertIsNone(detail.data["subscription"])
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/storage/files/").status_code, 403)

    def test_returning_to_client_starts_free_without_reactivating_paid_subscription(self):
        self.customer.role = "ADMIN"
        self.customer.save(update_fields=["role"])
        self.assertIsNone(self.customer.plan)
        # Una suscripción histórica nunca debe restaurar beneficios al cambiar de rol.
        Subscription.objects.create(user=self.customer, status="CANCELLED", end_date=timezone.now() + timedelta(days=30))
        self.customer.role = "CLIENT"
        self.customer.plan = self.pro
        self.customer.save(update_fields=["role"])
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.plan, self.free)
        self.assertEqual(self.customer.subscription.status, "ACTIVE")
        self.assertIsNone(self.customer.subscription.end_date)
        self.assertFalse(self.customer.subscription.auto_renew)
        self.assertEqual(get_user_features(self.customer), {"temporary_files": False, "share_links": False})
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get("/api/plans/current/").status_code, 200)
        self.assertEqual(self.client.get("/api/storage/usage/").status_code, 200)

    def test_management_permissions_remain_available_without_a_plan(self):
        for user in (self.admin, self.support):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get("/api/auth/management/users/").status_code, 200)
            self.assertEqual(self.client.get("/api/payments/management/").status_code, 200)
            self.assertEqual(self.client.get(f"/api/auth/management/{self.customer.pk}/").status_code, 200)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get("/api/admin/plans/").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/statistics/").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/audit/").status_code, 200)
