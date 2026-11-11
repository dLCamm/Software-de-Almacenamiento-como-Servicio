from datetime import timedelta
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from unittest.mock import patch

from storage.models import Archivo, EstadoElemento

User = get_user_model()


class TrashApiTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="trash-api@vaultdrive.local",
            password="SecurePassword123!",
        )
        self.other_user = User.objects.create_user(
            email="other-trash-api@vaultdrive.local",
            password="SecurePassword123!",
        )
        self.client = APIClient()

    def create_trashed_file(self, user, name="reporte.pdf", trashed_at=None):
        return Archivo.objects.create(
            usuario=user,
            nombre_original=name,
            extension="pdf",
            mime_type="application/pdf",
            tamano_bytes=100,
            bucket_minio="vaultdrive-storage",
            object_key=f"users/{uuid4()}.pdf",
            estado=EstadoElemento.PAPELERA,
            fecha_papelera=trashed_at or timezone.now(),
            papelera_grupo=uuid4(),
        )

    def test_trash_requires_authentication(self):
        response = self.client.get("/api/storage/trash/")

        self.assertEqual(response.status_code, 401)

    def test_trash_list_contains_only_current_users_items(self):
        own_file = self.create_trashed_file(self.user)
        self.create_trashed_file(self.other_user, "privado.pdf")
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/storage/trash/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(own_file.id))

    def test_api_rejects_permanent_delete_before_retention_expires(self):
        file = self.create_trashed_file(
            self.user,
            trashed_at=timezone.now() - timedelta(days=29),
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(
            f"/api/storage/files/{file.id}/?permanente=true"
        )

        self.assertEqual(response.status_code, 409)
        self.assertTrue(Archivo.objects.filter(id=file.id).exists())

    def test_restore_endpoint_restores_current_users_file(self):
        file = self.create_trashed_file(self.user)
        self.client.force_authenticate(user=self.user)

        response = self.client.post(f"/api/storage/files/{file.id}/restore/")

        self.assertEqual(response.status_code, 200)
        file.refresh_from_db()
        self.assertEqual(file.estado, EstadoElemento.ACTIVO)
        self.assertIsNone(file.fecha_papelera)

    def test_restore_endpoint_cannot_restore_another_users_file(self):
        file = self.create_trashed_file(self.other_user, "privado.pdf")
        self.client.force_authenticate(user=self.user)

        response = self.client.post(f"/api/storage/files/{file.id}/restore/")

        self.assertEqual(response.status_code, 404)
        file.refresh_from_db()
        self.assertEqual(file.estado, EstadoElemento.PAPELERA)

    def test_share_endpoint_rejects_invalid_expiry_values(self):
        self.client.force_authenticate(user=self.user)

        for expiry in ("not-a-number", 0, 604801):
            with self.subTest(expiry=expiry):
                response = self.client.post(
                    f"/api/storage/files/{uuid4()}/share/",
                    {"expiracion_segundos": expiry},
                    format="json",
                )
                self.assertEqual(response.status_code, 400)

    @patch("storage.views.FileService.generate_presigned_download_url")
    def test_share_endpoint_default_expiry_matches_minio_limit(self, generate_url):
        generate_url.return_value = "https://storage.example.test/signed"
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/storage/files/{uuid4()}/share/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["expira_en_segundos"], 604800)
        self.assertEqual(generate_url.call_args.kwargs["expiry_seconds"], 604800)
