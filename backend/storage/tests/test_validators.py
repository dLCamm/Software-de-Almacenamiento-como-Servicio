import io
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from storage.validators.file_validator import FileValidationError, FileValidator


class FileValidatorTestCase(SimpleTestCase):
    """Pruebas unitarias para validación estricta de formatos (RF-07, RNF-15)."""

    def test_valid_pdf_file(self):
        content = b"%PDF-1.4 header and sample pdf content"
        uploaded = SimpleUploadedFile("documento.pdf", content, content_type="application/pdf")
        ext, mime, size = FileValidator.validate(uploaded)
        self.assertEqual(ext, "pdf")
        self.assertEqual(mime, "application/pdf")
        self.assertEqual(size, len(content))

    def test_valid_png_file(self):
        content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        uploaded = SimpleUploadedFile("imagen.png", content, content_type="image/png")
        ext, mime, size = FileValidator.validate(uploaded)
        self.assertEqual(ext, "png")
        self.assertEqual(mime, "image/png")

    def test_unauthorized_extension_rejected(self):
        content = b"print('hacked')"
        uploaded = SimpleUploadedFile("script.py", content, content_type="text/x-python")
        with self.assertRaises(FileValidationError) as ctx:
            FileValidator.validate(uploaded)
        self.assertIn("no autorizado", str(ctx.exception).lower())

    def test_spoofed_file_rejected_by_magic_bytes(self):
        """Simula un archivo malicioso renombrado a .pdf pero con contenido de script."""
        content = b"echo 'Malicious binary pretending to be PDF'"
        uploaded = SimpleUploadedFile("virus.pdf", content, content_type="application/pdf")
        with self.assertRaises(FileValidationError) as ctx:
            FileValidator.validate(uploaded)
        self.assertIn("firma binaria", str(ctx.exception).lower())

    def test_empty_file_rejected(self):
        uploaded = SimpleUploadedFile("vacio.pdf", b"", content_type="application/pdf")
        with self.assertRaises(FileValidationError) as ctx:
            FileValidator.validate(uploaded)
        self.assertIn("vacío", str(ctx.exception).lower())
