from datetime import timedelta
from io import StringIO
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from payments.services.mock_gateway import MockPaymentResult
from plans.entitlements import PlanFeatureUnavailable, get_user_features
from plans.models import PlanBenefit, Subscription
from storage.interfaces.storage_backend import IStorageBackend
from storage.models import Archivo
from storage.services.file_service import FileService
from users.models import Plan, User


class PlanEntitlementTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="features@example.com", password="test-password")
        self.pro = Plan.objects.get(code="pro")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.backend = MagicMock(spec=IStorageBackend)
        self.backend.bucket_name = "test-storage"
        self.backend.get_presigned_url.return_value = "https://storage.example.com/shared.pdf"
        storage_patch = patch("storage.services.file_service.get_storage_backend", return_value=self.backend)
        storage_patch.start()
        self.addCleanup(storage_patch.stop)
        self.file = Archivo.objects.create(
            usuario=self.user, nombre_original="report.pdf", extension="pdf",
            mime_type="application/pdf", tamano_bytes=20,
            bucket_minio="test-storage", object_key="users/report.pdf",
        )

    def activate(self, plan=None, **subscription):
        self.user.plan = plan or self.pro
        self.user.save(update_fields=["plan"])
        defaults = {"start_date": timezone.now(), "end_date": timezone.now() + timedelta(days=30), "status": "ACTIVE"}
        defaults.update(subscription)
        Subscription.objects.update_or_create(user=self.user, defaults=defaults)

    def upload(self, temporary=True):
        return self.client.post("/api/storage/files/upload/", {
            "archivo": SimpleUploadedFile("sample.pdf", b"%PDF-1.4 sample", "application/pdf"),
            "es_temporal": str(temporary).lower(),
        }, format="multipart")

    def share(self):
        return self.client.post(f"/api/storage/files/{self.file.pk}/share/", {}, format="json")

    def assert_features(self, temporary, share):
        response = self.client.get("/api/storage/usage/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["features"], {"temporary_files": temporary, "share_links": share})

    def test_free_denies_paid_features_but_keeps_normal_uploads_and_downloads(self):
        self.assert_features(False, False)
        self.assertEqual(self.upload().status_code, 403)
        self.assertEqual(self.share().status_code, 403)
        self.backend.upload_object.assert_not_called()
        self.backend.get_presigned_url.assert_not_called()
        self.assertEqual(self.upload(temporary=False).status_code, 201)
        self.backend.download_object.return_value = iter([b"content"])
        response = self.client.get(f"/api/storage/files/{self.file.pk}/download/")
        self.assertEqual(response.status_code, 200)
        response.close()

    def test_pending_plan_does_not_grant_features(self):
        self.user.pending_plan = self.pro
        self.user.save(update_fields=["pending_plan"])
        Subscription.objects.create(user=self.user, end_date=timezone.now() + timedelta(days=30))
        self.assert_features(False, False)
        self.assertEqual(self.upload().status_code, 403)
        self.assertEqual(self.share().status_code, 403)

    def test_active_pro_and_business_grant_configured_features(self):
        for code in ("pro", "business"):
            with self.subTest(code=code):
                self.activate(Plan.objects.get(code=code))
                self.assert_features(True, True)
                self.assertEqual(self.upload().status_code, 201)
                self.assertEqual(self.share().status_code, 200)

    def test_missing_expired_cancelled_and_future_subscription_deny_features(self):
        self.user.plan = self.pro
        self.user.save(update_fields=["plan"])
        self.assert_features(False, False)
        self.assertEqual(self.upload().status_code, 403)
        self.assertEqual(self.share().status_code, 403)
        for changes in (
            {"end_date": None},
            {"end_date": timezone.now() - timedelta(seconds=1)},
            {"status": "EXPIRED"},
            {"status": "CANCELLED"},
            {"start_date": timezone.now() + timedelta(days=1)},
        ):
            with self.subTest(changes=changes):
                self.activate(**changes)
                self.assert_features(False, False)
                self.assertEqual(self.upload().status_code, 403)
                self.assertEqual(self.share().status_code, 403)
        self.backend.upload_object.assert_not_called()
        self.backend.get_presigned_url.assert_not_called()

    def test_custom_paid_plan_only_grants_selected_features(self):
        custom = Plan.objects.create(code="custom", name="Custom", storage_limit_bytes=1024**3, monthly_price=10)
        PlanBenefit.objects.create(plan=custom, feature="share_links", description="Compartir enlaces")
        self.activate(custom)
        self.assert_features(False, True)
        self.assertEqual(self.upload().status_code, 403)
        self.assertEqual(self.share().status_code, 200)
        custom.benefits.all().delete()
        PlanBenefit.objects.create(plan=custom, feature="temporary_files", description="Archivos temporales")
        self.assert_features(True, False)
        self.assertEqual(self.upload().status_code, 201)
        self.assertEqual(self.share().status_code, 403)

    def test_informative_text_never_grants_a_feature(self):
        self.pro.benefits.all().delete()
        PlanBenefit.objects.create(plan=self.pro, description="Compartir enlaces")
        self.activate()
        self.assert_features(False, False)

    def test_hidden_plan_still_honors_existing_paid_subscription(self):
        self.pro.is_active = False
        self.pro.save(update_fields=["is_active"])
        self.activate()
        self.assert_features(True, True)

    def test_enabled_sharing_still_requires_file_ownership(self):
        self.activate()
        other_user = User.objects.create_user(email="other-features@example.com")
        self.file.usuario = other_user
        self.file.save(update_fields=["usuario"])
        self.assertEqual(self.share().status_code, 404)
        self.backend.get_presigned_url.assert_not_called()

    def test_current_plan_distinguishes_catalog_features_from_available_features(self):
        self.activate(end_date=timezone.now() - timedelta(days=1))
        for url in ("/api/plans/current/", "/api/subscription/current/"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.data["plan"]["features"]["share_links"])
                self.assertFalse(response.data["features"]["share_links"])

    @patch("payments.views.MockPaymentGateway.process_payment")
    def test_renewal_reactivates_expired_features(self, process_payment):
        self.activate(end_date=timezone.now() - timedelta(days=1))
        self.assert_features(False, False)
        process_payment.return_value = MockPaymentResult(approved=True, status="APPROVED", reference="renewed", message="Aprobado")
        response = self.client.post("/api/payments/renew/", {
            "card": {"card_number": "0000000000000000", "expiry": "12/30", "cvv": "123"},
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assert_features(True, True)

    def test_service_layer_cannot_bypass_feature_checks(self):
        with self.assertRaises(PlanFeatureUnavailable):
            FileService.upload_file(self.user, None, is_temporary=True, storage_backend=self.backend)
        with self.assertRaises(PlanFeatureUnavailable):
            FileService.generate_presigned_download_url(self.user, self.file.pk, storage_backend=self.backend)

    @patch("payments.views.MockPaymentGateway.process_payment")
    def test_payment_rejection_approval_and_downgrade_change_access(self, process_payment):
        payload = {"plan_id": self.pro.pk, "card": {"card_number": "0000000000000000", "expiry": "12/30", "cvv": "123"}}
        process_payment.return_value = MockPaymentResult(approved=False, status="REJECTED", reference="rejected", message="Rechazado")
        self.assertEqual(self.client.post("/api/payments/change-plan/", payload, format="json").status_code, 402)
        self.user.refresh_from_db()
        self.assert_features(False, False)
        self.assertEqual(self.share().status_code, 403)
        process_payment.return_value = MockPaymentResult(approved=True, status="APPROVED", reference="approved", message="Aprobado")
        self.assertEqual(self.client.post("/api/payments/change-plan/", payload, format="json").status_code, 200)
        self.user.refresh_from_db()
        self.assert_features(True, True)
        self.assertEqual(self.share().status_code, 200)
        self.assertEqual(self.upload().status_code, 201)
        payload["plan_id"] = Plan.objects.get(code="free").pk
        self.assertEqual(self.client.post("/api/payments/change-plan/", payload, format="json").status_code, 200)
        self.user.refresh_from_db()
        self.assert_features(False, False)
        self.assertEqual(self.share().status_code, 403)


class AdminPlanFeatureTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email="admin-features@example.com", password="test-password")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.payload = {
            "code": "premium", "name": "Premium", "storage_limit_gb": "100.00",
            "monthly_price": "99.00", "is_active": True,
            "benefits": [{"description": "Compartir enlaces", "feature": "share_links", "order": 1}],
        }

    def test_create_edit_and_remove_functional_benefits(self):
        response = self.client.post("/api/admin/plans/", self.payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        plan = Plan.objects.get(pk=response.data["id"])
        self.assertEqual(plan.storage_limit_bytes, 100 * 1024**3)
        user = User.objects.create_user(email="custom-user@example.com", plan=plan)
        Subscription.objects.create(user=user, end_date=timezone.now() + timedelta(days=30))
        self.assertEqual(get_user_features(user), {"share_links": True, "temporary_files": False})
        response = self.client.patch(f"/api/admin/plans/{plan.pk}/", {"benefits": []}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(get_user_features(user), {"share_links": False, "temporary_files": False})

    def test_free_price_and_invalid_or_duplicate_features_are_rejected_atomically(self):
        for changes in (
            {"monthly_price": "0.00"},
            {"monthly_price": "-1.00"},
            {"storage_limit_gb": "0.00"},
            {"benefits": self.payload["benefits"] * 2},
            {"benefits": [{"description": "Unknown", "feature": "unknown"}]},
        ):
            with self.subTest(changes=changes):
                response = self.client.post("/api/admin/plans/", {**self.payload, **changes}, format="json")
                self.assertEqual(response.status_code, 400, response.data)
                self.assertFalse(Plan.objects.filter(code="premium").exists())

    def test_partial_price_change_checks_existing_benefits(self):
        plan = Plan.objects.get(code="pro")
        response = self.client.patch(f"/api/admin/plans/{plan.pk}/", {"monthly_price": "0.00"}, format="json")
        self.assertEqual(response.status_code, 400)
        plan.refresh_from_db()
        self.assertGreater(plan.monthly_price, 0)
        response = self.client.patch(f"/api/admin/plans/{plan.pk}/", {"monthly_price": "0.00", "benefits": []}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_free_plan_cannot_enable_features_or_break_registration_defaults(self):
        plan = Plan.objects.get(code="free")
        for changes in ({"benefits": self.payload["benefits"]}, {"code": "renamed"}, {"monthly_price": "1.00"}, {"is_active": False}):
            with self.subTest(changes=changes):
                response = self.client.patch(f"/api/admin/plans/{plan.pk}/", changes, format="json")
                self.assertEqual(response.status_code, 400)

    def test_client_cannot_change_plan_features(self):
        self.client.force_authenticate(User.objects.create_user(email="client-features@example.com"))
        response = self.client.post("/api/admin/plans/", self.payload, format="json")
        self.assertEqual(response.status_code, 403)

    def test_seed_uses_real_catalog_and_preserves_admin_configuration(self):
        plan = Plan.objects.get(code="pro")
        plan.benefits.filter(feature="share_links").delete()
        plan.monthly_price = 123
        plan.save(update_fields=["monthly_price"])
        call_command("seed_plans", stdout=StringIO())
        first_count = PlanBenefit.objects.count()
        call_command("seed_plans", stdout=StringIO())
        self.assertEqual(PlanBenefit.objects.count(), first_count)
        self.assertFalse(plan.benefits.filter(feature="share_links").exists())
        plan.refresh_from_db()
        self.assertEqual(plan.monthly_price, 123)
