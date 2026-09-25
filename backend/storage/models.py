import uuid
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class TipoArchivoPermitido(models.Model):
    """
    Catálogo de formatos de archivos autorizados en el sistema (RF-07, RNF-15).
    Formatos admitidos: .PDF, .DOC, .DOCX, .MP3, .PNG.
    """
    extension = models.CharField(max_length=15, unique=True, help_text="Ejemplo: pdf, png, doc, docx, mp3")
    mime_type = models.CharField(max_length=100, help_text="MIME type oficial, ej: application/pdf")
    tamano_maximo_mb = models.PositiveIntegerField(default=50, help_text="Límite máximo permitido en Megabytes")

    class Meta:
        verbose_name = "Tipo de Archivo Permitido"
        verbose_name_plural = "Tipos de Archivos Permitidos"
        ordering = ["extension"]

    def __str__(self) -> str:
        return f".{self.extension} ({self.mime_type})"


class EstadoElemento(models.TextChoices):
    ACTIVO = "activo", "Activo"
    PAPELERA = "papelera", "En Papelera"
    ELIMINADO = "eliminado", "Eliminado"


class Carpeta(models.Model):
    """
    Modelo representativo del Sistema Jerárquico de Carpetas (RF-08).
    Permite anidamiento arbitrario mediante auto-referencia 'carpeta_padre'.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="carpetas",
        db_index=True,
    )
    carpeta_padre = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="subcarpetas",
        db_index=True,
    )
    nombre = models.CharField(max_length=255)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(
        max_length=20,
        choices=EstadoElemento.choices,
        default=EstadoElemento.ACTIVO,
    )

    class Meta:
        verbose_name = "Carpeta"
        verbose_name_plural = "Carpetas"
        ordering = ["nombre"]
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "carpeta_padre", "nombre"],
                name="unique_carpeta_por_nivel",
            )
        ]

    def __str__(self) -> str:
        return f"{self.nombre} (Usuario: {self.usuario_id})"

    @property
    def es_raiz(self) -> bool:
        return self.carpeta_padre is None


class Archivo(models.Model):
    """
    Modelo para metadatos de Archivos en PostgreSQL (RF-06, RF-07, RF-10, RNF-14).
    Mantiene los metadatos separados del contenido binario almacenado en MinIO.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="archivos",
        db_index=True,
    )
    carpeta = models.ForeignKey(
        Carpeta,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="archivos",
        db_index=True,
    )
    nombre_original = models.CharField(max_length=255)
    extension = models.CharField(max_length=15, db_index=True)
    mime_type = models.CharField(max_length=100)
    tamano_bytes = models.BigIntegerField(validators=[MinValueValidator(1)])
    bucket_minio = models.CharField(max_length=100)
    object_key = models.CharField(
        max_length=500,
        unique=True,
        db_index=True,
        help_text="Clave o ruta de localización física del objeto en MinIO",
    )
    es_temporal = models.BooleanField(
        default=False,
        help_text="Indica si es un archivo con auto-eliminación por TTL (RF-10)",
    )
    fecha_expiracion = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora límite de vida del archivo temporal",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoElemento.choices,
        default=EstadoElemento.ACTIVO,
    )
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Archivo"
        verbose_name_plural = "Archivos"
        ordering = ["-fecha_subida"]

    def __str__(self) -> str:
        return f"{self.nombre_original} ({self.tamano_bytes} bytes)"
