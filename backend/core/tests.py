from decimal import Decimal
from uuid import uuid4

from django.test import TestCase
from rest_framework.test import APIClient

from core.audit import record_audit_event
from core.models import AuditLog
from payments.models import Payment
from storage.models import Archivo, EstadoElemento
from users.models import Plan, User


class AdminReportingTests(TestCase):
    def setUp(self):
        self.plan = Plan.objects.get(code=Plan.Code.FREE)
        self.admin = User.objects.create_user(
            email="admin-reporting@example.com",
            password="SafePassword123!",
            plan=self.plan,
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.client_user = User.objects.create_user(
            email="client-reporting@example.com",
            password="SafePassword123!",
            plan=self.plan,
        )
        self.api = APIClient()

    def create_file(self, extension, size, state=EstadoElemento.ACTIVO):
        return Archivo.objects.create(
            usuario=self.client_user,
            nombre_original=f"document.{extension}",
            extension=extension,
            mime_type="application/octet-stream",
            tamano_bytes=size,
            bucket_minio="test-storage",
            object_key=f"users/{self.client_user.pk}/{uuid4()}",
            estado=state,
        )

    def authenticate_as_admin(self):
        self.api.force_authenticate(user=self.admin)

    def test_admin_endpoints_reject_non_staff_users(self):
        self.api.force_authenticate(user=self.client_user)

        for url in (
            "/api/admin/audit/",
            "/api/admin/statistics/",
            "/api/admin/statistics/storage-by-type/",
        ):
            with self.subTest(url=url):
                response = self.api.get(url)
                self.assertEqual(response.status_code, 403)

    def test_audit_log_endpoint_filters_and_paginates_events(self):
        record_audit_event(
            self.client_user,
            "file.upload",
            "file",
            uuid4(),
            {"extension": "pdf"},
        )
        record_audit_event(self.client_user, "auth.login", "user", self.client_user.pk)
        self.authenticate_as_admin()

        response = self.api.get("/api/admin/audit/?action=file.upload")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        event = response.data["results"][0]
        self.assertEqual(event["action"], "file.upload")
        self.assertEqual(event["actor_email"], self.client_user.email)
        self.assertEqual(event["details"], {"extension": "pdf"})

    def test_statistics_include_clients_approved_revenue_and_stored_bytes(self):
        pro_plan = Plan.objects.get(code=Plan.Code.PRO)
        Payment.objects.create(
            user=self.client_user,
            plan=pro_plan,
            amount=Decimal("149.00"),
            payment_type="SUBSCRIPTION",
            status="APPROVED",
            transaction_reference="REPORT-APPROVED",
        )
        Payment.objects.create(
            user=self.client_user,
            plan=pro_plan,
            amount=Decimal("149.00"),
            payment_type="SUBSCRIPTION",
            status="REJECTED",
            transaction_reference="REPORT-REJECTED",
        )
        self.create_file("pdf", 100)
        self.create_file("png", 50, EstadoElemento.PAPELERA)
        self.create_file("txt", 500, EstadoElemento.ELIMINADO)
        self.authenticate_as_admin()

        response = self.api.get("/api/admin/statistics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["usuarios"]["clientes"], 1)
        self.assertEqual(response.data["usuarios"]["clientes_activos"], 1)
        self.assertEqual(response.data["ingresos"]["total_aprobado"], "149.00")
        self.assertEqual(response.data["ingresos"]["pagos_aprobados"], 1)
        self.assertEqual(response.data["pagos"]["rechazados"], 1)
        self.assertEqual(response.data["almacenamiento"]["usado_bytes"], 150)
        self.assertEqual(
            response.data["almacenamiento"]["archivos_activos_y_en_papelera"],
            2,
        )

    def test_storage_by_type_includes_trashed_but_not_deleted_files(self):
        self.create_file("pdf", 100)
        self.create_file("pdf", 50, EstadoElemento.PAPELERA)
        self.create_file("png", 500, EstadoElemento.ELIMINADO)
        self.authenticate_as_admin()

        response = self.api.get("/api/admin/statistics/storage-by-type/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_usado_bytes"], 150)
        self.assertEqual(
            response.data["tipos"],
            [{"extension": "pdf", "archivos_count": 2, "usado_bytes": 150}],
        )

    def test_audit_entries_can_be_created_without_an_actor(self):
        event = record_audit_event(
            actor=None,
            action="system.retention_purge",
            resource_type="file",
            details={"deleted_count": 2},
        )

        self.assertTrue(AuditLog.objects.filter(pk=event.pk, actor__isnull=True).exists())
