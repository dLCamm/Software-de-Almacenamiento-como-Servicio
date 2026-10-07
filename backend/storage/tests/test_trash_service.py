from datetime import timedelta
from unittest.mock import MagicMock
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from storage.interfaces.storage_backend import IStorageBackend
from storage.models import Archivo, Carpeta, EstadoElemento
from storage.services.file_service import FileService
from storage.services.trash_service import (
    TrashConflictError,
    TrashRetentionError,
    TrashService,
)

User = get_user_model()


class TrashServiceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="trash@vaultdrive.local",
            password="SecurePassword123!",
        )
        self.backend = MagicMock(spec=IStorageBackend)
        self.backend.delete_object.return_value = True

    def create_file(self, name, folder=None, state=EstadoElemento.ACTIVO, **extra_fields):
        fields = {"estado": state, **extra_fields}
        return Archivo.objects.create(
            usuario=self.user,
            carpeta=folder,
            nombre_original=name,
            extension="pdf",
            mime_type="application/pdf",
            tamano_bytes=100,
            bucket_minio="vaultdrive-storage",
            object_key=f"users/{uuid4()}.pdf",
            **fields,
        )

    def test_move_file_to_trash_records_timestamp_and_group(self):
        file = self.create_file("informe.pdf")

        trashed = TrashService.move_file_to_trash(self.user, file.id)

        self.assertEqual(trashed.estado, EstadoElemento.PAPELERA)
        self.assertIsNotNone(trashed.fecha_papelera)
        self.assertIsNotNone(trashed.papelera_grupo)

    def test_restore_file_clears_trash_metadata(self):
        file = self.create_file("informe.pdf")
        TrashService.move_file_to_trash(self.user, file.id)

        restored = TrashService.restore_file(self.user, file.id)

        self.assertEqual(restored.estado, EstadoElemento.ACTIVO)
        self.assertIsNone(restored.fecha_papelera)
        self.assertIsNone(restored.papelera_grupo)

    def test_files_in_trash_continue_counting_towards_storage_quota(self):
        file = self.create_file("informe.pdf")
        used_before = FileService.get_user_storage_usage(self.user)["usado_bytes"]
        TrashService.move_file_to_trash(self.user, file.id)
        used_after = FileService.get_user_storage_usage(self.user)["usado_bytes"]

        self.assertEqual(used_before, file.tamano_bytes)
        self.assertEqual(used_after, used_before)

    def test_move_folder_to_trash_marks_all_descendants_together(self):
        root = Carpeta.objects.create(usuario=self.user, nombre="Proyectos")
        child = Carpeta.objects.create(usuario=self.user, nombre="2026", carpeta_padre=root)
        file = self.create_file("informe.pdf", folder=child)

        trashed_root = TrashService.move_folder_to_trash(self.user, root.id)

        root.refresh_from_db()
        child.refresh_from_db()
        file.refresh_from_db()
        self.assertEqual(trashed_root.estado, EstadoElemento.PAPELERA)
        self.assertEqual(child.estado, EstadoElemento.PAPELERA)
        self.assertEqual(file.estado, EstadoElemento.PAPELERA)
        self.assertEqual(root.papelera_grupo, child.papelera_grupo)
        self.assertEqual(root.papelera_grupo, file.papelera_grupo)
        self.assertEqual(root.fecha_papelera, child.fecha_papelera)
        self.assertEqual(root.fecha_papelera, file.fecha_papelera)

    def test_restore_folder_restores_its_tree_and_contents(self):
        root = Carpeta.objects.create(usuario=self.user, nombre="Proyectos")
        child = Carpeta.objects.create(usuario=self.user, nombre="2026", carpeta_padre=root)
        file = self.create_file("informe.pdf", folder=child)
        TrashService.move_folder_to_trash(self.user, root.id)

        restored = TrashService.restore_folder(self.user, root.id)

        child.refresh_from_db()
        file.refresh_from_db()
        self.assertEqual(restored.estado, EstadoElemento.ACTIVO)
        self.assertEqual(child.estado, EstadoElemento.ACTIVO)
        self.assertEqual(file.estado, EstadoElemento.ACTIVO)
        self.assertIsNone(file.papelera_grupo)
        self.assertIsNone(child.fecha_papelera)

    def test_restore_file_rejects_name_conflict_in_original_folder(self):
        folder = Carpeta.objects.create(usuario=self.user, nombre="Proyectos")
        trashed = self.create_file("informe.pdf", folder=folder)
        TrashService.move_file_to_trash(self.user, trashed.id)
        self.create_file("informe.pdf", folder=folder)

        with self.assertRaises(TrashConflictError):
            TrashService.restore_file(self.user, trashed.id)

    def test_restore_folder_rejects_name_conflict_in_original_location(self):
        trashed = Carpeta.objects.create(usuario=self.user, nombre="Proyectos")
        TrashService.move_folder_to_trash(self.user, trashed.id)
        Carpeta.objects.create(usuario=self.user, nombre="Proyectos")

        with self.assertRaises(TrashConflictError):
            TrashService.restore_folder(self.user, trashed.id)

    def test_permanent_file_delete_is_blocked_before_retention_expires(self):
        file = self.create_file("informe.pdf")
        TrashService.move_file_to_trash(self.user, file.id)

        with self.assertRaises(TrashRetentionError):
            TrashService.delete_file_permanently(self.user, file.id, self.backend)

        self.backend.delete_object.assert_not_called()
        self.assertTrue(Archivo.objects.filter(id=file.id).exists())

    def test_permanent_file_delete_succeeds_after_retention_expires(self):
        file = self.create_file(
            "informe.pdf",
            estado=EstadoElemento.PAPELERA,
            fecha_papelera=timezone.now() - timedelta(days=31),
            papelera_grupo=uuid4(),
        )

        TrashService.delete_file_permanently(self.user, file.id, self.backend)

        self.backend.delete_object.assert_called_once_with(file.object_key)
        self.assertFalse(Archivo.objects.filter(id=file.id).exists())

    def test_permanent_folder_delete_removes_contents_after_retention(self):
        root = Carpeta.objects.create(usuario=self.user, nombre="Proyectos")
        child = Carpeta.objects.create(usuario=self.user, nombre="2026", carpeta_padre=root)
        file = self.create_file("informe.pdf", folder=child)
        TrashService.move_folder_to_trash(self.user, root.id)
        root.refresh_from_db()
        expired_at = timezone.now() - timedelta(days=31)
        Carpeta.objects.filter(papelera_grupo=root.papelera_grupo).update(fecha_papelera=expired_at)
        Archivo.objects.filter(papelera_grupo=root.papelera_grupo).update(fecha_papelera=expired_at)

        TrashService.delete_folder_permanently(self.user, root.id, self.backend)

        self.backend.delete_object.assert_called_once_with(file.object_key)
        self.assertFalse(Carpeta.objects.filter(id=root.id).exists())
        self.assertFalse(Carpeta.objects.filter(id=child.id).exists())
        self.assertFalse(Archivo.objects.filter(id=file.id).exists())

    def test_purge_removes_only_expired_trash_files(self):
        expired = self.create_file(
            "vencido.pdf",
            estado=EstadoElemento.PAPELERA,
            fecha_papelera=timezone.now() - timedelta(days=31),
            papelera_grupo=uuid4(),
        )
        recent = self.create_file(
            "reciente.pdf",
            estado=EstadoElemento.PAPELERA,
            fecha_papelera=timezone.now() - timedelta(days=2),
            papelera_grupo=uuid4(),
        )

        result = TrashService.purge_expired_trash(self.backend)

        self.assertEqual(result["archivos_eliminados"], 1)
        self.assertTrue(Archivo.objects.filter(id=recent.id).exists())
        self.assertFalse(Archivo.objects.filter(id=expired.id).exists())
        self.backend.delete_object.assert_called_once_with(expired.object_key)

    def test_purge_removes_expired_temporary_active_files(self):
        expired = self.create_file(
            "temporal.pdf",
            es_temporal=True,
            fecha_expiracion=timezone.now() - timedelta(minutes=1),
        )
        unexpired = self.create_file(
            "vigente.pdf",
            es_temporal=True,
            fecha_expiracion=timezone.now() + timedelta(days=1),
        )

        result = TrashService.purge_expired_temporary_files(self.backend)

        self.assertEqual(result, {"archivos_eliminados": 1, "errores": 0})
        self.assertFalse(Archivo.objects.filter(id=expired.id).exists())
        self.assertTrue(Archivo.objects.filter(id=unexpired.id).exists())
        self.backend.delete_object.assert_called_once_with(expired.object_key)

    def test_purge_does_not_delete_expired_temporary_files_in_trash(self):
        trashed = self.create_file(
            "temporal-papelera.pdf",
            state=EstadoElemento.PAPELERA,
            es_temporal=True,
            fecha_expiracion=timezone.now() - timedelta(days=1),
            fecha_papelera=timezone.now() - timedelta(days=1),
            papelera_grupo=uuid4(),
        )

        result = TrashService.purge_expired_temporary_files(self.backend)

        self.assertEqual(result, {"archivos_eliminados": 0, "errores": 0})
        self.assertTrue(Archivo.objects.filter(id=trashed.id).exists())
        self.backend.delete_object.assert_not_called()

    def test_purge_keeps_temporary_file_metadata_when_object_delete_fails(self):
        expired = self.create_file(
            "fallo.pdf",
            es_temporal=True,
            fecha_expiracion=timezone.now() - timedelta(minutes=1),
        )
        self.backend.delete_object.return_value = False

        result = TrashService.purge_expired_temporary_files(self.backend)

        self.assertEqual(result, {"archivos_eliminados": 0, "errores": 1})
        self.assertTrue(Archivo.objects.filter(id=expired.id).exists())

    def test_purge_keeps_folder_tree_when_a_binary_cannot_be_deleted(self):
        root = Carpeta.objects.create(usuario=self.user, nombre="Proyectos")
        file = self.create_file("informe.pdf", folder=root)
        TrashService.move_folder_to_trash(self.user, root.id)
        root.refresh_from_db()
        expired_at = timezone.now() - timedelta(days=31)
        Carpeta.objects.filter(papelera_grupo=root.papelera_grupo).update(fecha_papelera=expired_at)
        Archivo.objects.filter(papelera_grupo=root.papelera_grupo).update(fecha_papelera=expired_at)
        self.backend.delete_object.return_value = False

        result = TrashService.purge_expired_trash(self.backend)

        self.assertEqual(result["errores"], 1)
        self.assertTrue(Carpeta.objects.filter(id=root.id).exists())
        self.assertTrue(Archivo.objects.filter(id=file.id).exists())

    def test_purge_keeps_metadata_when_storage_delete_fails(self):
        file = self.create_file(
            "vencido.pdf",
            estado=EstadoElemento.PAPELERA,
            fecha_papelera=timezone.now() - timedelta(days=31),
            papelera_grupo=uuid4(),
        )
        self.backend.delete_object.return_value = False

        result = TrashService.purge_expired_trash(self.backend)

        self.assertEqual(result["errores"], 1)
        self.assertTrue(Archivo.objects.filter(id=file.id).exists())
