import logging
from datetime import timedelta
from typing import Optional
from uuid import uuid4

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from storage.interfaces.storage_backend import IStorageBackend
from storage.models import Archivo, Carpeta, EstadoElemento
from storage.services.storage_service import get_storage_backend

logger = logging.getLogger(__name__)

TRASH_RETENTION_DAYS = 30
TRASH_RETENTION = timedelta(days=TRASH_RETENTION_DAYS)


class TrashError(Exception):
    """Excepción base para errores del ciclo de vida de la papelera."""


class TrashNotFoundError(TrashError):
    """El elemento no existe, no pertenece al usuario o no está en papelera."""


class TrashConflictError(TrashError):
    """No es posible restaurar el elemento en su ubicación original."""


class TrashRetentionError(TrashError):
    """El periodo de retención no ha terminado."""


class TrashStorageError(TrashError):
    """No se pudo eliminar de forma segura el binario de MinIO."""


class TrashService:
    @staticmethod
    def _get_backend(storage_backend: Optional[IStorageBackend]) -> IStorageBackend:
        return storage_backend or get_storage_backend()

    @staticmethod
    def _expiration_date(fecha_papelera):
        return fecha_papelera + TRASH_RETENTION

    @classmethod
    def _ensure_retention_elapsed(cls, item) -> None:
        if item.fecha_papelera is None or timezone.now() < cls._expiration_date(item.fecha_papelera):
            raise TrashRetentionError(
                f"El elemento debe permanecer {TRASH_RETENTION_DAYS} días en la papelera antes de eliminarse."
            )

    @staticmethod
    def _descendant_folder_ids(user, root_folder_id) -> list:
        folder_ids = [root_folder_id]
        visited = {root_folder_id}
        frontier = [root_folder_id]
        while frontier:
            frontier = list(
                Carpeta.objects.filter(
                    usuario=user,
                    carpeta_padre_id__in=frontier,
                ).exclude(id__in=visited).values_list("id", flat=True)
            )
            visited.update(frontier)
            folder_ids.extend(frontier)
        return folder_ids

    @classmethod
    def move_file_to_trash(
        cls,
        user,
        file_id,
    ) -> Archivo:
        try:
            with transaction.atomic():
                archivo = Archivo.objects.select_for_update().get(
                    id=file_id,
                    usuario=user,
                    estado=EstadoElemento.ACTIVO,
                )
                now = timezone.now()
                archivo.estado = EstadoElemento.PAPELERA
                archivo.fecha_papelera = now
                archivo.papelera_grupo = uuid4()
                archivo.save(update_fields=["estado", "fecha_papelera", "papelera_grupo"])
                return archivo
        except Archivo.DoesNotExist as exc:
            raise TrashNotFoundError("El archivo no existe o ya está en la papelera.") from exc

    @classmethod
    def move_folder_to_trash(cls, user, folder_id) -> Carpeta:
        try:
            with transaction.atomic():
                folder = Carpeta.objects.select_for_update().get(
                    id=folder_id,
                    usuario=user,
                    estado=EstadoElemento.ACTIVO,
                )
                folder_ids = cls._descendant_folder_ids(user, folder.id)
                group_id = uuid4()
                now = timezone.now()
                Carpeta.objects.filter(usuario=user, id__in=folder_ids).update(
                    estado=EstadoElemento.PAPELERA,
                    fecha_papelera=now,
                    papelera_grupo=group_id,
                )
                Archivo.objects.filter(usuario=user, carpeta_id__in=folder_ids).update(
                    estado=EstadoElemento.PAPELERA,
                    fecha_papelera=now,
                    papelera_grupo=group_id,
                )
                folder.refresh_from_db()
                return folder
        except Carpeta.DoesNotExist as exc:
            raise TrashNotFoundError("La carpeta no existe o ya está en la papelera.") from exc

    @classmethod
    def list_trash(cls, user) -> list:
        files = Archivo.objects.filter(
            usuario=user,
            estado=EstadoElemento.PAPELERA,
            fecha_papelera__isnull=False,
        ).filter(Q(carpeta__isnull=True) | ~Q(carpeta__estado=EstadoElemento.PAPELERA))
        folders = Carpeta.objects.filter(
            usuario=user,
            estado=EstadoElemento.PAPELERA,
            fecha_papelera__isnull=False,
        ).filter(Q(carpeta_padre__isnull=True) | ~Q(carpeta_padre__estado=EstadoElemento.PAPELERA))

        items = [
            {
                "id": archivo.id,
                "tipo": "archivo",
                "nombre": archivo.nombre_original,
                "extension": archivo.extension,
                "tamano_bytes": archivo.tamano_bytes,
                "fecha_papelera": archivo.fecha_papelera,
                "fecha_eliminacion": cls._expiration_date(archivo.fecha_papelera),
            }
            for archivo in files
        ]
        items.extend(
            {
                "id": folder.id,
                "tipo": "carpeta",
                "nombre": folder.nombre,
                "extension": None,
                "tamano_bytes": None,
                "fecha_papelera": folder.fecha_papelera,
                "fecha_eliminacion": cls._expiration_date(folder.fecha_papelera),
            }
            for folder in folders
        )
        return sorted(items, key=lambda item: item["fecha_papelera"], reverse=True)

    @classmethod
    def restore_file(cls, user, file_id) -> Archivo:
        try:
            archivo = Archivo.objects.get(
                id=file_id,
                usuario=user,
                estado=EstadoElemento.PAPELERA,
            )
        except Archivo.DoesNotExist as exc:
            raise TrashNotFoundError("El archivo no existe en la papelera.") from exc

        if archivo.carpeta_id and not Carpeta.objects.filter(
            id=archivo.carpeta_id,
            usuario=user,
            estado=EstadoElemento.ACTIVO,
        ).exists():
            raise TrashConflictError("Restaura primero la carpeta que contiene este archivo.")

        if Archivo.objects.filter(
            usuario=user,
            carpeta_id=archivo.carpeta_id,
            nombre_original=archivo.nombre_original,
            estado=EstadoElemento.ACTIVO,
        ).exists():
            raise TrashConflictError(
                "Ya existe un archivo con ese nombre en su ubicación original. "
                "Mueve ese archivo a la papelera e inténtalo de nuevo."
            )

        archivo.estado = EstadoElemento.ACTIVO
        archivo.fecha_papelera = None
        archivo.papelera_grupo = None
        archivo.save(update_fields=["estado", "fecha_papelera", "papelera_grupo"])
        return archivo

    @classmethod
    def restore_folder(cls, user, folder_id) -> Carpeta:
        try:
            folder = Carpeta.objects.get(
                id=folder_id,
                usuario=user,
                estado=EstadoElemento.PAPELERA,
            )
        except Carpeta.DoesNotExist as exc:
            raise TrashNotFoundError("La carpeta no existe en la papelera.") from exc

        if folder.carpeta_padre_id:
            parent = Carpeta.objects.filter(
                id=folder.carpeta_padre_id,
                usuario=user,
                estado=EstadoElemento.ACTIVO,
            )
            if not parent.exists():
                raise TrashConflictError("Restaura primero la carpeta que contiene este elemento.")

        if Carpeta.objects.filter(
            usuario=user,
            carpeta_padre_id=folder.carpeta_padre_id,
            nombre=folder.nombre,
            estado=EstadoElemento.ACTIVO,
        ).exclude(id=folder.id).exists():
            raise TrashConflictError(
                "Ya existe una carpeta con ese nombre en su ubicación original. "
                "Mueve esa carpeta a la papelera e inténtalo de nuevo."
            )

        if folder.papelera_grupo is None:
            folder_filter = Q(id__in=cls._descendant_folder_ids(user, folder.id))
            file_filter = Q(carpeta_id__in=cls._descendant_folder_ids(user, folder.id))
        else:
            folder_filter = Q(papelera_grupo=folder.papelera_grupo)
            file_filter = Q(papelera_grupo=folder.papelera_grupo)
        with transaction.atomic():
            Carpeta.objects.filter(
                usuario=user,
                estado=EstadoElemento.PAPELERA,
            ).filter(folder_filter).update(
                estado=EstadoElemento.ACTIVO,
                fecha_papelera=None,
                papelera_grupo=None,
            )
            Archivo.objects.filter(
                usuario=user,
                estado=EstadoElemento.PAPELERA,
            ).filter(file_filter).update(
                estado=EstadoElemento.ACTIVO,
                fecha_papelera=None,
                papelera_grupo=None,
            )
        folder.refresh_from_db()
        return folder

    @classmethod
    def delete_file_permanently(
        cls,
        user,
        file_id,
        storage_backend: Optional[IStorageBackend] = None,
    ) -> None:
        try:
            archivo = Archivo.objects.get(
                id=file_id,
                usuario=user,
                estado=EstadoElemento.PAPELERA,
            )
        except Archivo.DoesNotExist as exc:
            raise TrashNotFoundError("El archivo no existe en la papelera.") from exc
        cls._ensure_retention_elapsed(archivo)
        backend = cls._get_backend(storage_backend)
        if not backend.delete_object(archivo.object_key):
            raise TrashStorageError("No se pudo eliminar el archivo del almacenamiento.")
        archivo.delete()

    @classmethod
    def delete_folder_permanently(
        cls,
        user,
        folder_id,
        storage_backend: Optional[IStorageBackend] = None,
    ) -> None:
        try:
            folder = Carpeta.objects.get(
                id=folder_id,
                usuario=user,
                estado=EstadoElemento.PAPELERA,
            )
        except Carpeta.DoesNotExist as exc:
            raise TrashNotFoundError("La carpeta no existe en la papelera.") from exc
        cls._ensure_retention_elapsed(folder)
        if folder.carpeta_padre_id and Carpeta.objects.filter(
            id=folder.carpeta_padre_id,
            usuario=user,
            estado=EstadoElemento.PAPELERA,
        ).exists():
            raise TrashConflictError("Elimina la carpeta desde el elemento superior de la papelera.")

        backend = cls._get_backend(storage_backend)
        if folder.papelera_grupo:
            files = Archivo.objects.filter(
                usuario=user,
                papelera_grupo=folder.papelera_grupo,
            )
            folders = Carpeta.objects.filter(
                usuario=user,
                papelera_grupo=folder.papelera_grupo,
                estado=EstadoElemento.PAPELERA,
            )
        else:
            folder_ids = cls._descendant_folder_ids(user, folder.id)
            files = Archivo.objects.filter(
                usuario=user,
                carpeta_id__in=folder_ids,
            )
            folders = Carpeta.objects.filter(
                usuario=user,
                id__in=folder_ids,
                estado=EstadoElemento.PAPELERA,
            )
        for archivo in files:
            if not backend.delete_object(archivo.object_key):
                raise TrashStorageError("No se pudieron eliminar todos los archivos de la carpeta.")
            archivo.delete()

        folders.delete()

    @classmethod
    def purge_expired_trash(
        cls,
        storage_backend: Optional[IStorageBackend] = None,
    ) -> dict:
        backend = cls._get_backend(storage_backend)
        cutoff = timezone.now() - TRASH_RETENTION
        file_groups = Archivo.objects.filter(
            estado=EstadoElemento.PAPELERA,
            fecha_papelera__lte=cutoff,
            papelera_grupo__isnull=False,
        ).values_list("papelera_grupo", flat=True).distinct()
        folder_groups = Carpeta.objects.filter(
            estado=EstadoElemento.PAPELERA,
            fecha_papelera__lte=cutoff,
            papelera_grupo__isnull=False,
        ).values_list("papelera_grupo", flat=True).distinct()

        counts = {"archivos_eliminados": 0, "carpetas_eliminadas": 0, "errores": 0}
        for group_id in set(file_groups).union(folder_groups):
            files = Archivo.objects.filter(
                estado=EstadoElemento.PAPELERA,
                papelera_grupo=group_id,
                fecha_papelera__lte=cutoff,
            )
            for archivo in files:
                if backend.delete_object(archivo.object_key):
                    archivo.delete()
                    counts["archivos_eliminados"] += 1
                else:
                    logger.error(
                        "No se purgó el archivo %s: MinIO no confirmó su eliminación.",
                        archivo.id,
                    )
                    counts["errores"] += 1

            if not Archivo.objects.filter(papelera_grupo=group_id).exists():
                folders = Carpeta.objects.filter(
                    estado=EstadoElemento.PAPELERA,
                    papelera_grupo=group_id,
                    fecha_papelera__lte=cutoff,
                )
                folder_count = folders.count()
                folders.delete()
                counts["carpetas_eliminadas"] += folder_count

        legacy_files = Archivo.objects.filter(
            estado=EstadoElemento.PAPELERA,
            fecha_papelera__lte=cutoff,
            papelera_grupo__isnull=True,
        )
        for archivo in legacy_files:
            if backend.delete_object(archivo.object_key):
                archivo.delete()
                counts["archivos_eliminados"] += 1
            else:
                logger.error(
                    "No se purgó el archivo %s: MinIO no confirmó su eliminación.",
                    archivo.id,
                )
                counts["errores"] += 1

        return counts

    @classmethod
    def purge_expired_temporary_files(
        cls,
        storage_backend: Optional[IStorageBackend] = None,
    ) -> dict:
        backend = cls._get_backend(storage_backend)
        expired_file_ids = Archivo.objects.filter(
            estado=EstadoElemento.ACTIVO,
            es_temporal=True,
            fecha_expiracion__lte=timezone.now(),
        ).values_list("id", flat=True)
        counts = {"archivos_eliminados": 0, "errores": 0}

        for file_id in expired_file_ids.iterator():
            with transaction.atomic():
                try:
                    archivo = Archivo.objects.select_for_update().get(
                        id=file_id,
                        estado=EstadoElemento.ACTIVO,
                        es_temporal=True,
                        fecha_expiracion__lte=timezone.now(),
                    )
                except Archivo.DoesNotExist:
                    continue

                if not backend.delete_object(archivo.object_key):
                    logger.error(
                        "No se purgó el archivo temporal %s: MinIO no confirmó su eliminación.",
                        archivo.id,
                    )
                    counts["errores"] += 1
                    continue

                archivo.delete()
                counts["archivos_eliminados"] += 1

        return counts
