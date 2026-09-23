import io
import logging
from datetime import timedelta
from typing import BinaryIO, Optional
from minio import Minio
from minio.error import S3Error
from urllib3.exceptions import MaxRetryError

from storage.interfaces.storage_backend import (
    IStorageBackend,
    StorageConnectionError,
    StorageError,
    StorageNotFoundError,
    StorageUploadError,
)

logger = logging.getLogger(__name__)


class MinioStorageBackend(IStorageBackend):
    """
    Implementación concreta de IStorageBackend utilizando el SDK oficial de MinIO.
    Cumple con el Principio de Responsabilidad Única (SRP) y Sustitución de Liskov (LSP).
    """

    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket_name: str,
        secure: bool = False,
    ) -> None:
        self.endpoint = endpoint
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket_name = bucket_name
        self.secure = secure
        self._client: Optional[Minio] = None

    @property
    def client(self) -> Minio:
        """Inicialización perezosa (lazy) del cliente MinIO."""
        if self._client is None:
            try:
                self._client = Minio(
                    endpoint=self.endpoint,
                    access_key=self.access_key,
                    secret_key=self.secret_key,
                    secure=self.secure,
                )
            except Exception as e:
                logger.error("Error al inicializar cliente MinIO: %s", str(e), exc_info=True)
                raise StorageConnectionError(f"No fue posible conectar con MinIO: {e}") from e
        return self._client

    def ensure_bucket_exists(self) -> None:
        """Garantiza que el bucket configurado exista; lo crea si no está presente."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info("Bucket '%s' creado exitosamente en MinIO.", self.bucket_name)
        except S3Error as e:
            logger.error("Error S3 al verificar o crear el bucket '%s': %s", self.bucket_name, str(e))
            raise StorageConnectionError(f"Error S3 en bucket {self.bucket_name}: {e.message}") from e
        except Exception as e:
            logger.error("Fallo de conexión con MinIO al verificar bucket: %s", str(e), exc_info=True)
            raise StorageConnectionError(f"Fallo de conexión con MinIO: {e}") from e

    def upload_object(
        self,
        object_name: str,
        data: BinaryIO,
        length: int,
        content_type: str,
    ) -> str:
        """Sube un archivo al bucket de MinIO."""
        try:
            self.ensure_bucket_exists()
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=data,
                length=length,
                content_type=content_type,
            )
            logger.info("Objeto '%s' subido exitosamente al bucket '%s'.", object_name, self.bucket_name)
            return object_name
        except S3Error as e:
            logger.error("Error S3 al subir '%s' a MinIO: %s", object_name, str(e), exc_info=True)
            raise StorageUploadError(f"Error de subida en MinIO: {e.message}") from e
        except Exception as e:
            logger.error("Excepción inesperada al subir '%s': %s", object_name, str(e), exc_info=True)
            raise StorageUploadError(f"Error al transferir archivo hacia MinIO: {e}") from e

    def download_object(self, object_name: str) -> BinaryIO:
        """Descarga un archivo desde MinIO devolviendo un stream en memoria."""
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            data = io.BytesIO(response.read())
            response.close()
            response.release_conn()
            data.seek(0)
            return data
        except S3Error as e:
            if e.code in ("NoSuchKey", "ResourceNotFound"):
                raise StorageNotFoundError(f"Objeto no encontrado en MinIO: {object_name}") from e
            logger.error("Error S3 al descargar '%s': %s", object_name, str(e), exc_info=True)
            raise StorageError(f"Error al descargar desde MinIO: {e.message}") from e
        except Exception as e:
            logger.error("Error inesperado al descargar '%s': %s", object_name, str(e), exc_info=True)
            raise StorageError(f"Error de conexión al descargar: {e}") from e

    def delete_object(self, object_name: str) -> bool:
        """Elimina un objeto de MinIO. Se usa también en rollbacks compensatorios."""
        try:
            self.client.remove_object(self.bucket_name, object_name)
            logger.info("Objeto '%s' eliminado de MinIO exitosamente.", object_name)
            return True
        except S3Error as e:
            logger.warning("Error S3 al eliminar objeto '%s': %s", object_name, str(e))
            return False
        except Exception as e:
            logger.error("Error inesperado al intentar eliminar '%s': %s", object_name, str(e), exc_info=True)
            return False

    def get_presigned_url(self, object_name: str, expiry_seconds: int = 3600) -> str:
        """Genera una URL temporal prefirmada para descarga segura."""
        try:
            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=timedelta(seconds=expiry_seconds),
            )
            return url
        except Exception as e:
            logger.error("Error al generar URL prefirmada para '%s': %s", object_name, str(e), exc_info=True)
            raise StorageError(f"No se pudo generar el enlace prefirmado: {e}") from e

    def check_health(self) -> bool:
        """Chequea la conectividad contra MinIO."""
        try:
            self.client.bucket_exists(self.bucket_name)
            return True
        except Exception as e:
            logger.warning("Fallo en healthcheck de MinIO: %s", str(e))
            return False
