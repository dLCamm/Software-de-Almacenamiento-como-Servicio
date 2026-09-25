import logging
from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from storage.models import Archivo, Carpeta, EstadoElemento
from storage.serializers import (
    FileDetailSerializer,
    FileUploadInputSerializer,
    FolderCreateSerializer,
    FolderRenameSerializer,
    FolderSerializer,
    StorageUsageSerializer,
)
from storage.services.file_service import (
    FileNotFoundServiceError,
    FileService,
    FileServiceError,
    StorageQuotaExceededError,
)
from storage.services.folder_service import (
    FolderDuplicateError,
    FolderNotFoundError,
    FolderService,
    FolderServiceError,
)
from storage.validators.file_validator import FileValidationError

logger = logging.getLogger(__name__)
User = get_user_model()


def _get_current_user(request):
    """
    Recupera el usuario de la petición. Si no está autenticado (ej. durante desarrollo temprano
    de Backend 1 o pruebas sin token), provee un usuario fallback seguro para evitar bloqueos.
    """
    if request.user and request.user.is_authenticated:
        return request.user
    # Fallback para desarrollo local
    user, _ = User.objects.get_or_create(
        email="dev@vaultdrive.local",
        defaults={"is_active": True, "role": "client"},
    )
    return user


class FileUploadView(APIView):
    """
    Endpoint para carga de archivos a MinIO y PostgreSQL (RF-06, RF-07, RF-09, RF-10).
    Método: POST /api/storage/files/upload/
    Formato: multipart/form-data
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        serializer = FileUploadInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = _get_current_user(request)
        validated_data = serializer.validated_data

        try:
            archivo = FileService.upload_file(
                user=user,
                uploaded_file=validated_data["archivo"],
                folder_id=validated_data.get("carpeta_id"),
                is_temporary=validated_data.get("es_temporal", False),
                ttl_days=validated_data.get("tiempo_vida_dias"),
            )
            response_serializer = FileDetailSerializer(archivo)
            return Response(
                {
                    "message": "Archivo cargado y persistido exitosamente.",
                    "archivo": response_serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        except FileValidationError as e:
            return Response({"error": "Validación de formato rechazada", "detalle": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except StorageQuotaExceededError as e:
            return Response({"error": "Límite de espacio excedido", "detalle": str(e)}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        except FileServiceError as e:
            logger.error("Error al procesar subida de archivo: %s", str(e), exc_info=True)
            return Response({"error": "Error interno en servicio de archivos", "detalle": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FileListView(APIView):
    """
    Endpoint para listado de archivos con filtros (RF-06).
    Método: GET /api/storage/files/
    Query params opcionales:
      - carpeta_id (UUID o 'root')
      - q (búsqueda por nombre)
      - formato (extensión)
    """

    def get(self, request, *args, **kwargs):
        user = _get_current_user(request)
        queryset = Archivo.objects.filter(usuario=user, estado=EstadoElemento.ACTIVO)

        carpeta_id = request.query_params.get("carpeta_id")
        if carpeta_id:
            if carpeta_id.lower() == "root":
                queryset = queryset.filter(carpeta__isnull=True)
            else:
                queryset = queryset.filter(carpeta_id=carpeta_id)

        query = request.query_params.get("q")
        if query:
            queryset = queryset.filter(nombre_original__icontains=query.strip())

        formato = request.query_params.get("formato")
        if formato:
            queryset = queryset.filter(extension__iexact=formato.strip().lstrip("."))

        serializer = FileDetailSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FileDetailView(APIView):
    """
    Endpoint para consulta y eliminación de un archivo específico.
    Métodos: GET, DELETE /api/storage/files/<uuid:file_id>/
    """

    def get(self, request, file_id, *args, **kwargs):
        user = _get_current_user(request)
        try:
            archivo = Archivo.objects.get(id=file_id, usuario=user)
            serializer = FileDetailSerializer(archivo)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Archivo.DoesNotExist:
            return Response({"error": "Archivo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, file_id, *args, **kwargs):
        user = _get_current_user(request)
        permanente = request.query_params.get("permanente", "false").lower() in ("true", "1")
        try:
            FileService.delete_file(user=user, file_id=file_id, permanent=permanente)
            return Response(
                {"message": f"Archivo {'eliminado definitivamente' if permanente else 'movido a la papelera'}."},
                status=status.HTTP_200_OK,
            )
        except FileNotFoundServiceError:
            return Response({"error": "Archivo no encontrado."}, status=status.HTTP_404_NOT_FOUND)


class FileDownloadView(APIView):
    """
    Descarga el contenido binario del archivo desde MinIO hacia el cliente.
    Método: GET /api/storage/files/<uuid:file_id>/download/
    """

    def get(self, request, file_id, *args, **kwargs):
        user = _get_current_user(request)
        try:
            archivo, stream = FileService.get_file_download_stream(user=user, file_id=file_id)
            response = FileResponse(
                stream,
                content_type=archivo.mime_type or "application/octet-stream",
            )
            response["Content-Disposition"] = f'attachment; filename="{archivo.nombre_original}"'
            response["Content-Length"] = archivo.tamano_bytes
            return response
        except FileNotFoundServiceError:
            return Response({"error": "Archivo no encontrado."}, status=status.HTTP_404_NOT_FOUND)


class FileShareView(APIView):
    """
    Genera un enlace público temporal prefirmado hacia MinIO (RF-11).
    Método: POST /api/storage/files/<uuid:file_id>/share/
    """

    def post(self, request, file_id, *args, **kwargs):
        user = _get_current_user(request)
        duracion_segundos = int(request.data.get("expiracion_segundos", 1209600))  # 14 días
        try:
            url = FileService.generate_presigned_download_url(
                user=user,
                file_id=file_id,
                expiry_seconds=duracion_segundos,
            )
            return Response({"download_url": url, "expira_en_segundos": duracion_segundos}, status=status.HTTP_200_OK)
        except FileNotFoundServiceError:
            return Response({"error": "Archivo no encontrado."}, status=status.HTTP_404_NOT_FOUND)


class FolderListCreateView(APIView):
    """
    Endpoint para listar y crear carpetas en el árbol jerárquico (RF-08).
    Método: GET, POST /api/storage/folders/
    """

    def get(self, request, *args, **kwargs):
        user = _get_current_user(request)
        parent_id = request.query_params.get("parent_id")
        folders = FolderService.list_folders(user=user, parent_id=parent_id)
        serializer = FolderSerializer(folders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        serializer = FolderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = _get_current_user(request)
        try:
            folder = FolderService.create_folder(
                user=user,
                name=serializer.validated_data["nombre"],
                parent_id=serializer.validated_data.get("carpeta_padre_id"),
            )
            return Response(FolderSerializer(folder).data, status=status.HTTP_201_CREATED)
        except FolderDuplicateError as e:
            return Response({"error": "Conflicto de nombre", "detalle": str(e)}, status=status.HTTP_409_CONFLICT)
        except FolderServiceError as e:
            return Response({"error": "Error al crear carpeta", "detalle": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FolderDetailView(APIView):
    """
    Endpoint para renombrar o eliminar una carpeta (RF-08).
    Método: PATCH, DELETE /api/storage/folders/<uuid:folder_id>/
    """

    def patch(self, request, folder_id, *args, **kwargs):
        serializer = FolderRenameSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = _get_current_user(request)
        try:
            folder = FolderService.rename_folder(
                user=user,
                folder_id=folder_id,
                new_name=serializer.validated_data["nuevo_nombre"],
            )
            return Response(FolderSerializer(folder).data, status=status.HTTP_200_OK)
        except FolderDuplicateError as e:
            return Response({"error": "Conflicto de nombre", "detalle": str(e)}, status=status.HTTP_409_CONFLICT)
        except FolderNotFoundError:
            return Response({"error": "Carpeta no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, folder_id, *args, **kwargs):
        user = _get_current_user(request)
        permanente = request.query_params.get("permanente", "false").lower() in ("true", "1")
        try:
            FolderService.delete_folder(user=user, folder_id=folder_id, soft_delete=not permanente)
            return Response({"message": "Carpeta eliminada exitosamente."}, status=status.HTTP_200_OK)
        except FolderNotFoundError:
            return Response({"error": "Carpeta no encontrada."}, status=status.HTTP_404_NOT_FOUND)


class StorageUsageView(APIView):
    """
    Endpoint para calcular y retornar el espacio ocupado y disponible en tiempo real (RF-09).
    Método: GET /api/storage/usage/
    """

    def get(self, request, *args, **kwargs):
        user = _get_current_user(request)
        usage = FileService.get_user_storage_usage(user)
        serializer = StorageUsageSerializer(usage)
        return Response(serializer.data, status=status.HTTP_200_OK)
