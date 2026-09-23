from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class StorageError(Exception):
    """Excepción base para errores de la capa de almacenamiento."""
    pass


class StorageConnectionError(StorageError):
    """Lanzada cuando no se puede conectar con el backend de almacenamiento (ej. MinIO caído)."""
    pass


class StorageUploadError(StorageError):
    """Lanzada cuando la carga de un objeto binario falla."""
    pass


class StorageNotFoundError(StorageError):
    """Lanzada cuando el objeto solicitado no existe en el almacenamiento."""
    pass


class IStorageBackend(ABC):
    """
    Contrato abstracto para backends de almacenamiento de objetos (DIP - SOLID).
    Permite desacoplar el monolito Django de la implementación técnica concreta (MinIO, S3, etc.).
    """

    @abstractmethod
    def upload_object(
        self,
        object_name: str,
        data: BinaryIO,
        length: int,
        content_type: str,
    ) -> str:
        """
        Sube un flujo binario al almacenamiento de objetos.

        :param object_name: Identificador o ruta única del objeto en el bucket.
        :param data: Flujo de bytes (stream) del archivo.
        :param length: Tamaño en bytes del flujo.
        :param content_type: Tipo MIME del archivo.
        :return: Retorna el object_name o identificador del recurso guardado.
        """
        pass

    @abstractmethod
    def download_object(self, object_name: str) -> BinaryIO:
        """
        Descarga el flujo binario de un objeto.

        :param object_name: Identificador del objeto en el bucket.
        :return: Flujo de bytes para lectura.
        """
        pass

    @abstractmethod
    def delete_object(self, object_name: str) -> bool:
        """
        Elimina un objeto del almacenamiento.
        Utilizado también en rollbacks compensatorios si la persistencia en DB falla.

        :param object_name: Identificador del objeto a eliminar.
        :return: True si fue eliminado exitosamente o no existía.
        """
        pass

    @abstractmethod
    def get_presigned_url(self, object_name: str, expiry_seconds: int = 3600) -> str:
        """
        Genera una URL firmada con tiempo de expiración (RF-11 / RNF-17).

        :param object_name: Identificador del objeto.
        :param expiry_seconds: Duración de validez en segundos.
        :return: URL segura para acceso directo temporal.
        """
        pass

    @abstractmethod
    def check_health(self) -> bool:
        """
        Verifica el estado de salud y conectividad con el almacenamiento.
        :return: True si el servicio responde satisfactoriamente.
        """
        pass
