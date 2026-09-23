"""Interfaces del módulo de almacenamiento."""
from .storage_backend import (
    IStorageBackend,
    StorageError,
    StorageConnectionError,
    StorageUploadError,
    StorageNotFoundError,
)

__all__ = [
    "IStorageBackend",
    "StorageError",
    "StorageConnectionError",
    "StorageUploadError",
    "StorageNotFoundError",
]
