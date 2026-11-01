from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import record_audit_event
from .emails import send_account_email
from .models import User
from .serializers import AccountEmailSerializer, AccountTokenSerializer, PasswordResetConfirmSerializer
from .throttles import AuthEmailIPThrottle, AuthEmailRecipientThrottle
from .tokens import email_verification_token, password_recovery_token


INVALID_LINK = "El enlace no es válido o ha vencido. Solicita uno nuevo."


def user_for_token(data, generator):
    # Llamar dentro de transaction.atomic() para consumir el enlace una sola vez.
    try:
        uid = force_str(urlsafe_base64_decode(data["uid"]))
        user = User.objects.select_for_update().get(pk=uid, is_active=True)
    except (ValueError, TypeError, OverflowError, UnicodeDecodeError, User.DoesNotExist):
        raise serializers.ValidationError({"detail": INVALID_LINK}) from None
    if not user.has_usable_password() or not generator.check_token(user, data["token"]):
        raise serializers.ValidationError({"detail": INVALID_LINK})
    return user


class PublicAccountView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEmailIPThrottle]


class AccountEmailRequestView(PublicAccountView):
    throttle_classes = [AuthEmailIPThrottle, AuthEmailRecipientThrottle]
    verification = False

    def post(self, request):
        serializer = AccountEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email__iexact=serializer.validated_data["email"], is_active=True)
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            user = None
        if user and user.has_usable_password() and (not self.verification or not user.is_email_verified):
            send_account_email(user, verification=self.verification)
        # Misma respuesta para correos desconocidos, verificados o cuentas inactivas.
        detail = (
            "Si la cuenta existe y está pendiente de verificación, recibirás un enlace. Revisa también spam."
            if self.verification else
            "Si existe una cuenta activa con ese correo, recibirás un enlace de recuperación. Revisa también spam."
        )
        return Response({"detail": detail})


class ResendVerificationView(AccountEmailRequestView):
    verification = True


class PasswordResetRequestView(AccountEmailRequestView):
    pass


class VerifyEmailView(PublicAccountView):
    def post(self, request):
        serializer = AccountTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = user_for_token(serializer.validated_data, email_verification_token)
            if user.is_email_verified:
                raise serializers.ValidationError({"detail": INVALID_LINK})
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified", "updated_at"])
            record_audit_event(actor=user, action="auth.email_verified", resource_type="user", resource_id=user.pk)
        return Response({"detail": "Correo verificado correctamente. Ya puedes iniciar sesión."})


class PasswordResetConfirmView(PublicAccountView):
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            user = user_for_token(data, password_recovery_token)
            try:
                validate_password(data["password"], user=user)
            except DjangoValidationError as error:
                raise serializers.ValidationError({"password": error.messages}) from error
            user.set_password(data["password"])
            user.save(update_fields=["password", "updated_at"])
            record_audit_event(actor=user, action="auth.password_reset", resource_type="user", resource_id=user.pk)
        return Response({"detail": "Contraseña actualizada. Inicia sesión con tu nueva contraseña."})
