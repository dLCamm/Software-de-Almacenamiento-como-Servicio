import datetime
import logging
import os
import re
import uuid
from typing import BinaryIO, Optional, Union
from uuid import UUID

from django.core.files.uploadedfile import UploadedFile
from django.db import models, transaction
from django.utils import timezone

from storage.interfaces.storage_backend import (
    IStorageBackend,
    StorageError,
    StorageNotFoundError,
    StorageUploadError,
)
from storage.models import Archivo, Carpeta, EstadoElemento
from storage.services.storage_service import get_storage_backend
from storage.validators.file_validator import FileValidationError, FileValidator

logger = logging.getLogger(__name__)


class FileServiceError(Exception):
    """Excepción base para errores en el servicio de archivos."""
    pass


class StorageQuotaExceededError(FileServiceError):
    """Lanzada cuando el usuario supera su cuota de almacenamiento disponible (RF-09)."""
    pass


class FileNotFoundServiceError(FileServiceError):
    """Lanzada cuando un archivo solicitado no existe o no pertenece al usuario."""
    pass


class FileService:
    """
    Servicio orquestador para la gestión y ciclo de vida de archivos (RF-06, RF-07, RF-09, RF-10).
    Aplica principios SOLID:
    - SRP: Orquesta validación, subida binaria a MinIO y persistencia atómica en PostgreSQL.
    - DIP: Depende de la abstracción IStorageBackend.
    - RNF-14: Implementa rollback compensatorio ante fallos de persistencia en base de datos.
    """

    DEFAULT_USER_QUOTA_BYTES = 5 * 1024 * 1024 * 1024  # 5 GB cuota base gratuita (Plan Free)

    @classmethod
    def upload_file(
        cls,
        user,
        uploaded_file: UploadedFile,
        folder_id: Optional[Union[str, UUID]] = None,
        is_temporary: bool = False,
        ttl_days: Optional[int] = None,
        storage_backend: Optional[IStorageBackend] = None,
    ) -> Archivo:
        """
        Flujo completo de subida de archivo conforme al Diagrama de Secuencia 4.3.3.

        1. Validación estricta de formato y firma binaria (RF-07).
        2. Verificación de cuota de almacenamiento disponible (RF-09).
        3. Carga binaria en MinIO.
        4. Inserción atómica en PostgreSQL con rollback compensatorio en caso de error.
        """
        backend = storage_backend or get_storage_backend()

        # 1. Validación de Formato y Tamaño (RF-07)
        extension, mime_type, file_size = FileValidator.validate(uploaded_file)

        # 2. Verificar existencia de carpeta destino si fue provista
        folder_instance: Optional[Carpeta] = None
        if folder_id:
            try:
                folder_instance = Carpeta.objects.get(
                    id=folder_id,
                    usuario=user,
                    estado=EstadoElemento.ACTIVO,
                )
            except Carpeta.DoesNotExist:
                raise FileServiceError("La carpeta seleccionada no existe o no le pertenece.")

        # 3. Validación de Cuota de Almacenamiento (RF-09)
        cls._validate_user_quota(user, file_size)

        # 4. Cálculo de fecha de expiración para archivos temporales (RF-10)
        fecha_expiracion = None
        if is_temporary:
            dias_vida = ttl_days if (ttl_days and ttl_days > 0) else 14  # 14 días por defecto
            fecha_expiracion = timezone.now() + datetime.timedelta(days=dias_vida)

        # 5. Generar Object Key seguro y determinista en MinIO
        safe_original_name = cls._sanitize_filename(uploaded_file.name or "archivo")
        file_uuid = uuid.uuid4().hex
        object_key = f"users/{user.id}/{file_uuid}_{safe_original_name}"

        # 6. Carga física del binario hacia MinIO
        try:
            # Asegurar posición inicial del stream
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(0)

            backend.upload_object(
                object_name=object_key,
                data=uploaded_file,
                length=file_size,
                content_type=mime_type,
            )
        except (StorageUploadError, StorageError) as storage_exc:
            logger.error("Error al transferir binario a MinIO: %s", str(storage_exc), exc_info=True)
            raise FileServiceError(f"Fallo en el servicio de almacenamiento de objetos: {storage_exc}") from storage_exc

        # 7. Persistencia Atómica en PostgreSQL y Rollback Compensatorio (RNF-14)
        try:
            with transaction.atomic():
                archivo = Archivo.objects.create(
                    usuario=user,
                    carpeta=folder_instance,
                    nombre_original=uploaded_file.name or safe_original_name,
                    extension=extension,
                    mime_type=mime_type,
                    tamano_bytes=file_size,
                    bucket_minio=getattr(backend, "bucket_name", "vaultdrive-storage"),
                    object_key=object_key,
                    es_temporal=is_temporary,
                    fecha_expiracion=fecha_expiracion,
                    estado=EstadoElemento.ACTIVO,
                )
                logger.info(
                    "Archivo '%s' registrado exitosamente en DB (ID: %s, MinIO Key: %s).",
                    archivo.nombre_original,
                    archivo.id,
                    object_key,
                )
                return archivo

        except Exception as db_exc:
            logger.critical(
                "Fallo crítico al guardar metadatos en DB para el objeto '%s'. "
                "Iniciando rollback compensatorio en MinIO para evitar archivos huérfanos...",
                object_key,
                exc_info=True,
            )
            # Limpieza compensatoria del binario en MinIO
            backend.delete_object(object_key)
            raise FileServiceError(
                f"Error al registrar metadatos en la base de datos. Operación abortada: {db_exc}"
            ) from db_exc

    @classmethod
    def get_file_download_stream(
        cls,
        user,
        file_id: Union[str, UUID],
        storage_backend: Optional[IStorageBackend] = None,
    ) -> tuple[Archivo, BinaryIO]:
        """Recupera la instancia del archivo y su flujo binario desde MinIO."""
        backend = storage_backend or get_storage_backend()
        try:
            archivo = Archivo.objects.get(
                id=file_id,
                usuario=user,
                estado=EstadoElemento.ACTIVO,
            )
        except Archivo.DoesNotExist:
            raise FileNotFoundServiceError("El archivo no existe o fue eliminado.")

        stream = backend.download_object(archivo.object_key)
        return archivo, stream

    @classmethod
    def generate_presigned_download_url(
        cls,
        user,
        file_id: Union[str, UUID],
        expiry_seconds: int = 1209600,  # 2 semanas por defecto (RF-11)
        storage_backend: Optional[IStorageBackend] = None,
    ) -> str:
        """Genera un enlace prefirmado directo hacia MinIO (RF-11)."""
        backend = storage_backend or get_storage_backend()
        try:
            archivo = Archivo.objects.get(
                id=file_id,
                usuario=user,
                estado=EstadoElemento.ACTIVO,
            )
        except Archivo.DoesNotExist:
            raise FileNotFoundServiceError("El archivo no existe o no tiene permisos para compartirlo.")

        return backend.get_presigned_url(archivo.object_key, expiry_seconds=expiry_seconds)

    @classmethod
    def delete_file(
        cls,
        user,
        file_id: Union[str, UUID],
        permanent: bool = False,
        storage_backend: Optional[IStorageBackend] = None,
    ) -> None:
        """Elimina un archivo (eliminación lógica o física con borrado en MinIO)."""
        backend = storage_backend or get_storage_backend()
        try:
            archivo = Archivo.objects.get(id=file_id, usuario=user)
        except Archivo.DoesNotExist:
            raise FileNotFoundServiceError("El archivo a eliminar no existe.")

        if permanent:
            # Eliminación física tanto en MinIO como en DB
            backend.delete_object(archivo.object_key)
            archivo.delete()
            logger.info("Archivo ID %s eliminado permanentemente de MinIO y DB.", file_id)
        else:
            # Eliminación lógica (papelera)
            archivo.estado = EstadoElemento.PAPELERA
            archivo.save(update_fields=["estado"])
            logger.info("Archivo ID %s movido a papelera.", file_id)

    @classmethod
    def get_user_storage_usage(cls, user) -> dict:
        """Calcula el uso actual de almacenamiento del usuario (RF-09)."""
        total_used = Archivo.objects.filter(
            usuario=user,
            estado=EstadoElemento.ACTIVO,
        ).aggregate(total=models.Sum("tamano_bytes"))["total"] or 0

        max_quota = getattr(user, "storage_limit_bytes", cls.DEFAULT_USER_QUOTA_BYTES)
        available = max(0, max_quota - total_used)

        return {
            "usado_bytes": total_used,
            "maximo_bytes": max_quota,
            "disponible_bytes": available,
            "porcentaje_usado": round((total_used / max_quota) * 100, 2) if max_quota > 0 else 0.0,
        }

    @classmethod
    def _validate_user_quota(cls, user, additional_bytes: int) -> None:
        """Verifica que el usuario no sobrepase su cuota contratada (RF-09)."""
        usage = cls.get_user_storage_usage(user)
        if usage["usado_bytes"] + additional_bytes > usage["maximo_bytes"]:
            raise StorageQuotaExceededError(
                f"No cuenta con espacio suficiente en su plan. Espacio requerido: "
                f"{round(additional_bytes / (1024 * 1024), 2)} MB. "
                f"Espacio disponible: {round(usage['disponible_bytes'] / (1024 * 1024), 2)} MB."
            )

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """Limpia el nombre de archivo para prevenir Path Traversal y caracteres peligrosos."""
        base = os.path.basename(filename)
        cleaned = re.sub(r"[^\w\.-]", "_", base)
        return cleaned[:100]
