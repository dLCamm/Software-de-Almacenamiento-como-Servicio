import io
from unittest.mock import MagicMock, patch
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from storage.interfaces.storage_backend import IStorageBackend, StorageUploadError
from storage.models import Archivo, Carpeta, EstadoElemento
from storage.services.file_service import FileService, FileServiceError, StorageQuotaExceededError

User = get_user_model()


class FileServiceTestCase(TestCase):
    """Pruebas unitarias para FileService con Mock de StorageBackend (SOLID)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@vaultdrive.local",
            password="securepassword123",
        )
        self.mock_backend = MagicMock(spec=IStorageBackend)
        self.mock_backend.bucket_name = "vaultdrive-storage"
        self.mock_backend.upload_object.return_value = "users/1/mock_key.pdf"

    def test_upload_file_success(self):
        content = b"%PDF-1.4 sample content"
        uploaded = SimpleUploadedFile("reporte.pdf", content, content_type="application/pdf")

        archivo = FileService.upload_file(
            user=self.user,
            uploaded_file=uploaded,
            storage_backend=self.mock_backend,
        )

        self.assertIsNotNone(archivo.id)
        self.assertEqual(archivo.nombre_original, "reporte.pdf")
        self.assertEqual(archivo.extension, "pdf")
        self.assertEqual(archivo.tamano_bytes, len(content))
        self.assertEqual(archivo.estado, EstadoElemento.ACTIVO)
        self.assertTrue(self.mock_backend.upload_object.called)

    def test_upload_file_compensatory_rollback_on_db_failure(self):
        """Verifica que si la DB falla al guardar, se borre el binario en MinIO (RNF-14)."""
        content = b"%PDF-1.4 sample content"
        uploaded = SimpleUploadedFile("factura.pdf", content, content_type="application/pdf")

        with patch("storage.models.Archivo.objects.create", side_effect=Exception("Database connection died")):
            with self.assertRaises(FileServiceError):
                FileService.upload_file(
                    user=self.user,
                    uploaded_file=uploaded,
                    storage_backend=self.mock_backend,
                )

            # Verificar que se invocó delete_object para limpiar el archivo huérfano
            self.assertTrue(self.mock_backend.delete_object.called)

    def test_quota_exceeded_raises_error(self):
        """Verifica que se rechace la subida si excede la cuota contratada (RF-09)."""
        content = b"%PDF-1.4 large file"
        uploaded = SimpleUploadedFile("grande.pdf", content, content_type="application/pdf")

        # Mockeamos la cuota máxima del usuario a 10 bytes
        with patch.object(FileService, "DEFAULT_USER_QUOTA_BYTES", 10):
            with self.assertRaises(StorageQuotaExceededError):
                FileService.upload_file(
                    user=self.user,
                    uploaded_file=uploaded,
                    storage_backend=self.mock_backend,
                )
