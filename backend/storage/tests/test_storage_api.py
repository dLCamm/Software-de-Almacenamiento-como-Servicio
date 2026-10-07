from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from storage.interfaces.storage_backend import IStorageBackend
from storage.models import Archivo, Carpeta, EstadoElemento
from users.models import Plan


User = get_user_model()
PDF_CONTENT = b"%PDF-1.4 sample document"


class StorageApiTestCase(TestCase):
    """API coverage for the existing storage flows using a mocked MinIO boundary."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="storage-api@vaultdrive.local",
            password="test-password",
        )
        self.other_user = User.objects.create_user(
            email="other-storage-api@vaultdrive.local",
            password="test-password",
        )
        self.client = APIClient()
        self.storage_backend = MagicMock(spec=IStorageBackend)
        self.storage_backend.bucket_name = "test-storage"
        self.storage_backend.download_object.return_value = iter([PDF_CONTENT])

        storage_patch = patch(
            "storage.services.file_service.get_storage_backend",
            return_value=self.storage_backend,
        )
        storage_patch.start()
        self.addCleanup(storage_patch.stop)

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def create_file(
        self,
        user=None,
        name="report.pdf",
        folder=None,
        size=100,
        state=EstadoElemento.ACTIVO,
        trashed_at=None,
    ):
        return Archivo.objects.create(
            usuario=user or self.user,
            carpeta=folder,
            nombre_original=name,
            extension=name.rsplit(".", 1)[-1],
            mime_type="application/pdf",
            tamano_bytes=size,
            bucket_minio="test-storage",
            object_key=f"users/{uuid4()}/{name}",
            estado=state,
            fecha_papelera=trashed_at,
            papelera_grupo=uuid4() if state == EstadoElemento.PAPELERA else None,
        )

    def test_file_list_requires_authentication(self):
        response = self.client.get("/api/storage/files/")

        self.assertEqual(response.status_code, 401)

    def test_file_list_filters_results_and_isolates_users(self):
        own_match = self.create_file(name="Quarterly report.pdf")
        self.create_file(name="Quarterly report.png")
        self.create_file(name="Quarterly report.pdf", folder=Carpeta.objects.create(
            usuario=self.user,
            nombre="Reports",
        ))
        self.create_file(user=self.other_user, name="Quarterly report.pdf")
        self.authenticate()

        response = self.client.get(
            "/api/storage/files/?carpeta_id=root&q=quarterly&formato=.PDF"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([str(item["id"]) for item in response.data], [str(own_match.id)])

    def test_upload_persists_valid_multipart_file_in_root(self):
        self.authenticate()
        uploaded = SimpleUploadedFile(
            "invoice.pdf",
            PDF_CONTENT,
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/storage/files/upload/",
            {"archivo": uploaded},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        archivo = Archivo.objects.get(id=response.data["archivo"]["id"])
        self.assertEqual(archivo.usuario, self.user)
        self.assertIsNone(archivo.carpeta)
        self.assertEqual(archivo.nombre_original, "invoice.pdf")
        self.assertEqual(archivo.tamano_bytes, len(PDF_CONTENT))
        self.storage_backend.upload_object.assert_called_once()

    def test_upload_persists_valid_file_in_own_folder(self):
        folder = Carpeta.objects.create(usuario=self.user, nombre="Invoices")
        self.authenticate()
        uploaded = SimpleUploadedFile(
            "invoice.pdf",
            PDF_CONTENT,
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/storage/files/upload/",
            {"archivo": uploaded, "carpeta_id": str(folder.id)},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            Archivo.objects.get(id=response.data["archivo"]["id"]).carpeta,
            folder,
        )

    def test_upload_rejects_invalid_file_with_400(self):
        self.authenticate()
        uploaded = SimpleUploadedFile(
            "spoofed.pdf",
            b"not a PDF",
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/storage/files/upload/",
            {"archivo": uploaded},
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.storage_backend.upload_object.assert_not_called()

    def test_upload_returns_413_when_plan_quota_is_exceeded(self):
        limited_plan = Plan.objects.create(
            code="api-test",
            name="API Test",
            storage_limit_bytes=1,
            monthly_price=Decimal("0.00"),
        )
        self.user.plan = limited_plan
        self.user.save(update_fields=["plan"])
        self.authenticate()
        uploaded = SimpleUploadedFile(
            "invoice.pdf",
            PDF_CONTENT,
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/storage/files/upload/",
            {"archivo": uploaded},
            format="multipart",
        )

        self.assertEqual(response.status_code, 413)
        self.storage_backend.upload_object.assert_not_called()

    def test_download_requires_authentication(self):
        archivo = self.create_file()

        response = self.client.get(
            f"/api/storage/files/{archivo.id}/download/"
        )

        self.assertEqual(response.status_code, 401)

    def test_download_returns_content_and_headers_for_owner(self):
        archivo = self.create_file(name="manual.pdf", size=len(PDF_CONTENT))
        self.authenticate()

        response = self.client.get(
            f"/api/storage/files/{archivo.id}/download/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertEqual(response["Content-Disposition"], 'attachment; filename="manual.pdf"')
        self.assertEqual(response["Content-Length"], str(len(PDF_CONTENT)))
        self.assertEqual(b"".join(response.streaming_content), PDF_CONTENT)
        self.storage_backend.download_object.assert_called_once_with(archivo.object_key)

    def test_download_hides_another_users_file_with_404(self):
        archivo = self.create_file(user=self.other_user)
        self.authenticate()

        response = self.client.get(
            f"/api/storage/files/{archivo.id}/download/"
        )

        self.assertEqual(response.status_code, 404)
        self.storage_backend.download_object.assert_not_called()

    def test_delete_moves_owned_file_to_trash_without_removing_binary(self):
        archivo = self.create_file()
        self.authenticate()

        response = self.client.delete(f"/api/storage/files/{archivo.id}/")

        self.assertEqual(response.status_code, 200)
        archivo.refresh_from_db()
        self.assertEqual(archivo.estado, EstadoElemento.PAPELERA)
        self.assertIsNotNone(archivo.fecha_papelera)
        self.storage_backend.delete_object.assert_not_called()

    def test_delete_cannot_move_another_users_file_to_trash(self):
        archivo = self.create_file(user=self.other_user)
        self.authenticate()

        response = self.client.delete(f"/api/storage/files/{archivo.id}/")

        self.assertEqual(response.status_code, 404)
        archivo.refresh_from_db()
        self.assertEqual(archivo.estado, EstadoElemento.ACTIVO)

    def test_folder_list_is_authenticated_and_isolates_users_and_parent(self):
        root = Carpeta.objects.create(usuario=self.user, nombre="Projects")
        child = Carpeta.objects.create(
            usuario=self.user,
            nombre="2026",
            carpeta_padre=root,
        )
        Carpeta.objects.create(usuario=self.user, nombre="Personal")
        Carpeta.objects.create(usuario=self.other_user, nombre="Private")
        self.authenticate()

        root_response = self.client.get("/api/storage/folders/")
        child_response = self.client.get(
            f"/api/storage/folders/?parent_id={root.id}"
        )

        self.assertEqual(root_response.status_code, 200)
        self.assertEqual(
            {item["nombre"] for item in root_response.data},
            {"Projects", "Personal"},
        )
        self.assertEqual(child_response.status_code, 200)
        self.assertEqual([item["nombre"] for item in child_response.data], ["2026"])
        self.assertNotIn("Private", {item["nombre"] for item in root_response.data})

    def test_folder_create_supports_root_and_owned_parent(self):
        parent = Carpeta.objects.create(usuario=self.user, nombre="Projects")
        self.authenticate()

        root_response = self.client.post(
            "/api/storage/folders/",
            {"nombre": "Personal"},
            format="json",
        )
        child_response = self.client.post(
            "/api/storage/folders/",
            {"nombre": "2026", "carpeta_padre_id": str(parent.id)},
            format="json",
        )

        self.assertEqual(root_response.status_code, 201)
        self.assertIsNone(
            Carpeta.objects.get(id=root_response.data["id"]).carpeta_padre
        )
        self.assertEqual(child_response.status_code, 201)
        self.assertEqual(
            Carpeta.objects.get(id=child_response.data["id"]).carpeta_padre,
            parent,
        )

    def test_folder_create_rejects_duplicate_name_in_parent_with_409(self):
        parent = Carpeta.objects.create(usuario=self.user, nombre="Projects")
        Carpeta.objects.create(
            usuario=self.user,
            nombre="2026",
            carpeta_padre=parent,
        )
        self.authenticate()

        response = self.client.post(
            "/api/storage/folders/",
            {"nombre": "2026", "carpeta_padre_id": str(parent.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 409)

    def test_folder_rename_succeeds_and_reports_conflict(self):
        parent = Carpeta.objects.create(usuario=self.user, nombre="Projects")
        target = Carpeta.objects.create(
            usuario=self.user,
            nombre="Draft",
            carpeta_padre=parent,
        )
        Carpeta.objects.create(
            usuario=self.user,
            nombre="Final",
            carpeta_padre=parent,
        )
        self.authenticate()

        rename_response = self.client.patch(
            f"/api/storage/folders/{target.id}/",
            {"nuevo_nombre": "Review"},
            format="json",
        )
        conflict_response = self.client.patch(
            f"/api/storage/folders/{target.id}/",
            {"nuevo_nombre": "Final"},
            format="json",
        )

        self.assertEqual(rename_response.status_code, 200)
        self.assertEqual(rename_response.data["nombre"], "Review")
        self.assertEqual(conflict_response.status_code, 409)

    def test_folder_rename_and_delete_enforce_ownership(self):
        folder = Carpeta.objects.create(usuario=self.other_user, nombre="Private")
        self.authenticate()

        rename_response = self.client.patch(
            f"/api/storage/folders/{folder.id}/",
            {"nuevo_nombre": "Changed"},
            format="json",
        )
        delete_response = self.client.delete(
            f"/api/storage/folders/{folder.id}/"
        )

        self.assertEqual(rename_response.status_code, 404)
        self.assertEqual(delete_response.status_code, 404)
        folder.refresh_from_db()
        self.assertEqual(folder.nombre, "Private")
        self.assertEqual(folder.estado, EstadoElemento.ACTIVO)

    def test_folder_delete_moves_owned_folder_to_trash(self):
        folder = Carpeta.objects.create(usuario=self.user, nombre="Projects")
        self.authenticate()

        response = self.client.delete(f"/api/storage/folders/{folder.id}/")

        self.assertEqual(response.status_code, 200)
        folder.refresh_from_db()
        self.assertEqual(folder.estado, EstadoElemento.PAPELERA)
        self.assertIsNotNone(folder.fecha_papelera)

    def test_usage_reports_exact_active_and_trash_bytes(self):
        plan = Plan.objects.create(
            code="usage-test",
            name="Usage Test",
            storage_limit_bytes=1000,
            monthly_price=Decimal("0.00"),
        )
        self.user.plan = plan
        self.user.save(update_fields=["plan"])
        self.create_file(name="active.pdf", size=125)
        self.create_file(
            name="trashed.pdf",
            size=250,
            state=EstadoElemento.PAPELERA,
            trashed_at=timezone.now() - timedelta(days=2),
        )
        self.create_file(name="deleted.pdf", size=500, state=EstadoElemento.ELIMINADO)
        self.authenticate()

        response = self.client.get("/api/storage/usage/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["usado_bytes"], 375)
        self.assertEqual(response.data["maximo_bytes"], 1000)
        self.assertEqual(response.data["disponible_bytes"], 625)
        self.assertEqual(response.data["porcentaje_usado"], 37.5)
        self.assertEqual(response.data["plan_codigo"], "usage-test")
