import logging
from typing import List, Optional, Union
from uuid import UUID
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from storage.models import Carpeta, EstadoElemento

logger = logging.getLogger(__name__)


class FolderServiceError(Exception):
    """Excepción base para operaciones del servicio de carpetas."""
    pass


class FolderNotFoundError(FolderServiceError):
    pass


class FolderDuplicateError(FolderServiceError):
    pass


class FolderService:
    """
    Servicio de dominio para la gestión del sistema jerárquico de carpetas (RF-08).
    Principio SRP: Toda la lógica de creación, navegación y jerarquía reside aquí.
    """

    @classmethod
    def create_folder(
        cls,
        user,
        name: str,
        parent_id: Optional[Union[str, UUID]] = None,
    ) -> Carpeta:
        """
        Crea una nueva carpeta para el usuario autenticado.

        :param user: Instancia del usuario propietario.
        :param name: Nombre de la carpeta.
        :param parent_id: ID de la carpeta contenedora o None si es nivel raíz.
        :return: Instancia de Carpeta creada.
        """
        clean_name = (name or "").strip()
        if not clean_name:
            raise FolderServiceError("El nombre de la carpeta no puede estar vacío.")

        parent_folder: Optional[Carpeta] = None
        if parent_id:
            try:
                parent_folder = Carpeta.objects.get(
                    id=parent_id,
                    usuario=user,
                    estado=EstadoElemento.ACTIVO,
                )
            except Carpeta.DoesNotExist:
                raise FolderNotFoundError(f"La carpeta padre '{parent_id}' no existe o no pertenece al usuario.")

        try:
            folder = Carpeta.objects.create(
                usuario=user,
                carpeta_padre=parent_folder,
                nombre=clean_name,
                estado=EstadoElemento.ACTIVO,
            )
            logger.info("Carpeta '%s' (ID: %s) creada para usuario %s.", clean_name, folder.id, user.id)
            return folder
        except IntegrityError as e:
            logger.warning("Intento de carpeta duplicada '%s' para usuario %s.", clean_name, user.id)
            raise FolderDuplicateError(
                f"Ya existe una carpeta con el nombre '{clean_name}' en esta ubicación."
            ) from e

    @classmethod
    def list_folders(
        cls,
        user,
        parent_id: Optional[Union[str, UUID]] = None,
    ):
        """Retorna las carpetas activas de un usuario en un nivel específico."""
        queryset = Carpeta.objects.filter(
            usuario=user,
            estado=EstadoElemento.ACTIVO,
        )
        if parent_id:
            return queryset.filter(carpeta_padre_id=parent_id)
        return queryset.filter(carpeta_padre__isnull=True)

    @classmethod
    def rename_folder(
        cls,
        user,
        folder_id: Union[str, UUID],
        new_name: str,
    ) -> Carpeta:
        """Renombra una carpeta existente."""
        clean_name = (new_name or "").strip()
        if not clean_name:
            raise FolderServiceError("El nuevo nombre no puede estar vacío.")

        try:
            folder = Carpeta.objects.get(
                id=folder_id,
                usuario=user,
                estado=EstadoElemento.ACTIVO,
            )
        except Carpeta.DoesNotExist:
            raise FolderNotFoundError("La carpeta especificada no existe.")

        folder.nombre = clean_name
        try:
            folder.save(update_fields=["nombre"])
            logger.info("Carpeta ID %s renombrada a '%s'.", folder_id, clean_name)
            return folder
        except IntegrityError as e:
            raise FolderDuplicateError(
                f"Ya existe una carpeta con el nombre '{clean_name}' en esta ubicación."
            ) from e

    @classmethod
    def delete_folder(
        cls,
        user,
        folder_id: Union[str, UUID],
        soft_delete: bool = True,
    ) -> None:
        """Elimina una carpeta (borrado lógico por defecto o cascada física)."""
        try:
            folder = Carpeta.objects.get(id=folder_id, usuario=user)
        except Carpeta.DoesNotExist:
            raise FolderNotFoundError("La carpeta a eliminar no existe.")

        if soft_delete:
            folder.estado = EstadoElemento.PAPELERA
            folder.save(update_fields=["estado"])
            logger.info("Carpeta ID %s marcada como papelera.", folder_id)
        else:
            folder.delete()
            logger.info("Carpeta ID %s eliminada permanentemente.", folder_id)
