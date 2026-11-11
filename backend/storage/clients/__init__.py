"""Clientes concretos para almacenamiento de objetos."""
from .minio_client import MinioStorageBackend

__all__ = ["MinioStorageBackend"]
