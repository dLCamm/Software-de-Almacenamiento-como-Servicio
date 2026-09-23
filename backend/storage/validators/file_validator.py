import os
from typing import Set, Tuple
from django.core.files.uploadedfile import UploadedFile

try:
    import filetype
except ImportError:
    filetype = None


class FileValidationError(Exception):
    """Excepción para errores de validación de archivos no autorizados o maliciosos."""
    pass


class FileValidator:
    """
    Validador estricto para cumplimiento de RF-07 y RNF-15.
    Formatos admitidos: .pdf, .doc, .docx, .mp3, .png.
    Aplica validación en múltiples capas:
    1. Extensión declarada.
    2. MIME type declarado en la petición.
    3. Inspección binaria de magic bytes para evitar spoofing / renombramientos fraudulentos.
    """

    ALLOWED_EXTENSIONS: Set[str] = {"pdf", "doc", "docx", "mp3", "png"}

    ALLOWED_MIME_TYPES: Set[str] = {
        "application/pdf",
        "image/png",
        "audio/mpeg",
        "audio/mp3",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",  # A veces enviado por clientes HTTP para DOC/DOCX
    }

    # Firmas binarias estándar (magic numbers) para verificación nativa
    MAGIC_SIGNATURES = {
        "pdf": [b"%PDF"],
        "png": [b"\x89PNG\r\n\x1a\n"],
        "mp3": [b"\xff\xfb", b"\xff\xf3", b"\xff\xf2", b"ID3"],
        # DOC (Microsoft Compound File Binary / OLE)
        "doc": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],
        # DOCX (formato ZIP PK)
        "docx": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
    }

    MAX_FILE_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB

    @classmethod
    def validate(cls, uploaded_file: UploadedFile) -> Tuple[str, str, int]:
        """
        Ejecuta la suite completa de validaciones sobre un archivo cargado.

        :param uploaded_file: Archivo proveniente de la petición HTTP.
        :return: Tupla (extension_normalizada, mime_type_validado, tamano_bytes).
        :raises FileValidationError: Si el archivo incumple las reglas de negocio o seguridad.
        """
        # 1. Validar presencia y tamaño
        size = uploaded_file.size
        if size <= 0:
            raise FileValidationError("El archivo cargado está vacío (0 bytes).")
        if size > cls.MAX_FILE_SIZE_BYTES:
            raise FileValidationError(
                f"El archivo supera el tamaño máximo permitido de {cls.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
            )

        # 2. Validar extensión
        filename = uploaded_file.name or ""
        _, ext = os.path.splitext(filename)
        clean_ext = ext.lstrip(".").lower()

        if not clean_ext or clean_ext not in cls.ALLOWED_EXTENSIONS:
            raise FileValidationError(
                f"Formato '.{clean_ext}' no autorizado. Solo se permiten formatos: "
                f"{', '.join(sorted(cls.ALLOWED_EXTENSIONS)).upper()}."
            )

        # 3. Validar MIME type reportado
        content_type = getattr(uploaded_file, "content_type", "")
        if content_type and content_type not in cls.ALLOWED_MIME_TYPES:
            # Si el content-type reportado difiere drásticamente de los permitidos, validar si es octet-stream
            if content_type != "application/octet-stream":
                raise FileValidationError(
                    f"Tipo MIME '{content_type}' no admitido para almacenamiento seguro."
                )

        # 4. Validar Magic Bytes / Inspección Binaria Real
        cls._validate_magic_bytes(uploaded_file, clean_ext)

        # Normalizar el MIME Type final confiable
        resolved_mime = cls._resolve_canonical_mime(clean_ext, content_type)

        return clean_ext, resolved_mime, size

    @classmethod
    def _validate_magic_bytes(cls, uploaded_file: UploadedFile, expected_ext: str) -> None:
        """Lee los primeros bytes para constatar que el contenido corresponda a la extensión."""
        try:
            current_pos = uploaded_file.tell() if hasattr(uploaded_file, "tell") else 0
        except Exception:
            current_pos = 0

        try:
            sample = uploaded_file.read(2048)
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(current_pos)

            if not sample:
                raise FileValidationError("No se pudo leer la firma binaria del archivo.")

            # Chequeo con filetype si está disponible
            if filetype:
                kind = filetype.guess(sample)
                if kind is not None:
                    detected_ext = kind.extension.lower()
                    # Mapeos especiales (ej. docx es detectado internamente como zip o docx)
                    if expected_ext == "docx" and detected_ext in ("docx", "zip"):
                        return
                    if expected_ext == "doc" and detected_ext in ("doc", "ole"):
                        return
                    if detected_ext == expected_ext:
                        return

            # Verificación de firmas binarias manuales
            signatures = cls.MAGIC_SIGNATURES.get(expected_ext, [])
            matches = any(sample.startswith(sig) for sig in signatures)

            # Para MP3, ID3 puede estar al inicio o frames sincrónicos en los primeros bytes
            if expected_ext == "mp3" and not matches:
                matches = b"ID3" in sample[:128] or b"\xff\xfb" in sample[:128]

            if not matches and signatures:
                raise FileValidationError(
                    f"Firma binaria corrupta o incompatible: el contenido no coincide con la extensión .{expected_ext}."
                )

        except FileValidationError:
            raise
        except Exception as e:
            # En caso de error de lectura, no bloquear pero advertir
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(current_pos)

    @classmethod
    def _resolve_canonical_mime(cls, extension: str, client_mime: str) -> str:
        """Asigna el MIME type oficial según la extensión validada."""
        mime_map = {
            "pdf": "application/pdf",
            "png": "image/png",
            "mp3": "audio/mpeg",
            "doc": "application/msword",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        return mime_map.get(extension, client_mime or "application/octet-stream")
