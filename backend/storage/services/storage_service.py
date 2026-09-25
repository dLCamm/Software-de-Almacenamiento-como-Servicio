from django.conf import settings
from storage.clients.minio_client import MinioStorageBackend
from storage.interfaces.storage_backend import IStorageBackend

_storage_instance: IStorageBackend | None = None


def get_storage_backend() -> IStorageBackend:
    """
    Factory / Provider para obtener la instancia del backend de almacenamiento configurado.
    Permite aplicar Dependency Inversion (DIP) y facilita el reemplazo por mocks en tests.
    """
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = MinioStorageBackend(
            endpoint=getattr(settings, "MINIO_ENDPOINT", "localhost:9000"),
            access_key=getattr(settings, "MINIO_ACCESS_KEY", "minioadmin"),
            secret_key=getattr(settings, "MINIO_SECRET_KEY", "minioadmin"),
            bucket_name=getattr(settings, "MINIO_BUCKET_NAME", "vaultdrive-storage"),
            secure=getattr(settings, "MINIO_USE_SSL", False),
        )
    return _storage_instance


def set_storage_backend(backend: IStorageBackend | None) -> None:
    """Permite inyectar un backend alternativo o mock durante pruebas unitarias."""
    global _storage_instance
    _storage_instance = backend
