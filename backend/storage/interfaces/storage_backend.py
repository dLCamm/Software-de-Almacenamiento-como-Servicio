from abc import ABC, abstractmethod
from typing import BinaryIO, Iterable


class StorageError(Exception):
    pass


class StorageConnectionError(StorageError):
    pass


class StorageUploadError(StorageError):
    pass


class StorageNotFoundError(StorageError):
    pass


class IStorageBackend(ABC):

    @abstractmethod
    def upload_object(
        self,
        object_name: str,
        data: BinaryIO,
        length: int,
        content_type: str,
    ) -> str:
        pass

    @abstractmethod
    def download_object(self, object_name: str) -> Iterable[bytes]:
        pass

    @abstractmethod
    def delete_object(self, object_name: str) -> bool:
        pass

    @abstractmethod
    def get_presigned_url(self, object_name: str, expiry_seconds: int = 3600) -> str:
        pass

    @abstractmethod
    def check_health(self) -> bool:
        pass
