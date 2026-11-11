from django.contrib.auth.tokens import PasswordResetTokenGenerator


class AccountTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return (
            f"{super()._make_hash_value(user, timestamp)}"
            f"{user.is_active}{user.is_email_verified}"
        )


class EmailVerificationTokenGenerator(AccountTokenGenerator):
    # Separar los propósitos impide usar un enlace de recuperación para verificar.
    key_salt = "users.email_verification"


class PasswordRecoveryTokenGenerator(AccountTokenGenerator):
    key_salt = "users.password_recovery"


email_verification_token = EmailVerificationTokenGenerator()
password_recovery_token = PasswordRecoveryTokenGenerator()
