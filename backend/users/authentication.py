from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class VerifiedJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        # SimpleJWT también compara el hash de contraseña con CHECK_REVOKE_TOKEN.
        user = super().get_user(validated_token)
        if not user.is_email_verified or validated_token.get("email") != user.email:
            raise AuthenticationFailed("Verifica tu correo e inicia sesión nuevamente.")
        return user
