from django.contrib import admin
from storage.models import Archivo, Carpeta, TipoArchivoPermitido


@admin.register(TipoArchivoPermitido)
class TipoArchivoPermitidoAdmin(admin.ModelAdmin):
    list_display = ("extension", "mime_type", "tamano_maximo_mb")
    search_fields = ("extension", "mime_type")


@admin.register(Carpeta)
class CarpetaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "usuario", "carpeta_padre", "estado", "fecha_creacion")
    list_filter = ("estado", "fecha_creacion")
    search_fields = ("nombre", "usuario__username", "usuario__email")


@admin.register(Archivo)
class ArchivoAdmin(admin.ModelAdmin):
    list_display = (
        "nombre_original",
        "extension",
        "tamano_bytes",
        "usuario",
        "carpeta",
        "es_temporal",
        "fecha_expiracion",
        "estado",
        "fecha_subida",
    )
    list_filter = ("extension", "es_temporal", "estado", "fecha_subida")
    search_fields = ("nombre_original", "object_key", "usuario__username", "usuario__email")
