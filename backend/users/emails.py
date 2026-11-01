import logging
from smtplib import SMTPException
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import email_verification_token, password_recovery_token

logger = logging.getLogger(__name__)


def send_account_email(user, *, verification=False):
    generator = email_verification_token if verification else password_recovery_token
    path = "verify-email" if verification else "reset-password"
    query = urlencode({
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": generator.make_token(user),
    })
    # Usar un origen configurado, nunca Host ni una URL proporcionada por el cliente.
    link = f"{settings.FRONTEND_URL.rstrip('/')}/{path}?{query}"
    action = "verificar tu correo electrónico" if verification else "restablecer tu contraseña"
    subject = "Verifica tu correo en Kubo" if verification else "Recupera tu contraseña de Kubo"
    message = EmailMessage(
        subject=subject,
        body=(
            f"Hola,\n\nPara {action}, abre este enlace:\n\n{link}\n\n"
            f"El enlace vence en {settings.PASSWORD_RESET_TIMEOUT // 60} minutos "
            "y solo puede utilizarse una vez.\n\n"
            "Si no solicitaste este correo, puedes ignorarlo.\n\nEl equipo de Kubo"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    try:
        return message.send(using="default") == 1
    except (SMTPException, OSError):
        # No registrar el token, la contraseña ni la dirección del destinatario.
        logger.error("No se pudo entregar el correo de %s para usuario %s", path, user.pk)
        return False
