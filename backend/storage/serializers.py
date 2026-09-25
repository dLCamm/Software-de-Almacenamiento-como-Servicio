from rest_framework import serializers
from storage.models import Archivo, Carpeta, EstadoElemento


class FolderSerializer(serializers.ModelSerializer):
    """Serializador para representación de carpetas."""
    subcarpetas_count = serializers.SerializerMethodField()
    archivos_count = serializers.SerializerMethodField()

    class Meta:
        model = Carpeta
        fields = [
            "id",
            "nombre",
            "carpeta_padre",
            "fecha_creacion",
            "estado",
            "subcarpetas_count",
            "archivos_count",
        ]
        read_only_fields = ["id", "fecha_creacion", "subcarpetas_count", "archivos_count"]

    def get_subcarpetas_count(self, obj: Carpeta) -> int:
        return obj.subcarpetas.filter(estado=EstadoElemento.ACTIVO).count()

    def get_archivos_count(self, obj: Carpeta) -> int:
        return obj.archivos.filter(estado=EstadoElemento.ACTIVO).count()


class FolderCreateSerializer(serializers.Serializer):
    """Validador de entrada para creación de carpetas."""
    nombre = serializers.CharField(max_length=255, required=True, trim_whitespace=True)
    carpeta_padre_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class FolderRenameSerializer(serializers.Serializer):
    """Validador para renombrar carpetas."""
    nuevo_nombre = serializers.CharField(max_length=255, required=True, trim_whitespace=True)


class FileUploadInputSerializer(serializers.Serializer):
    """Validador para la subida multipart/form-data de archivos."""
    archivo = serializers.FileField(required=True)
    carpeta_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    es_temporal = serializers.BooleanField(required=False, default=False)
    tiempo_vida_dias = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=365,
        default=14,
    )


class FileDetailSerializer(serializers.ModelSerializer):
    """Serializador detallado para metadatos de archivos (RF-06)."""
    tamano_legible = serializers.SerializerMethodField()
    carpeta_nombre = serializers.ReadOnlyField(source="carpeta.nombre", default=None)

    class Meta:
        model = Archivo
        fields = [
            "id",
            "nombre_original",
            "extension",
            "mime_type",
            "tamano_bytes",
            "tamano_legible",
            "carpeta",
            "carpeta_nombre",
            "es_temporal",
            "fecha_expiracion",
            "estado",
            "fecha_subida",
        ]
        read_only_fields = fields

    def get_tamano_legible(self, obj: Archivo) -> str:
        bytes_val = obj.tamano_bytes
        for unit in ["B", "KB", "MB", "GB"]:
            if bytes_val < 1024.0:
                return f"{bytes_val:.2f} {unit}"
            bytes_val /= 1024.0
        return f"{bytes_val:.2f} TB"


class StorageUsageSerializer(serializers.Serializer):
    """Serializador para visualización de cuota y espacio en tiempo real (RF-09)."""
    usado_bytes = serializers.IntegerField()
    maximo_bytes = serializers.IntegerField()
    disponible_bytes = serializers.IntegerField()
    porcentaje_usado = serializers.FloatField()
