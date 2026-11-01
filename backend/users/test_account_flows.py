from datetime import datetime, timedelta
from smtplib import SMTPException
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import AuditLog
from .models import User
from .serializers import LoginSerializer, UserAdminUpdateSerializer
from .tokens import email_verification_token, password_recovery_token


@override_settings(FRONTEND_URL="https://app.example.com", PASSWORD_RESET_TIMEOUT=1800)
class AccountFlowTests(TestCase):
    password = "SecurePass123!"
    new_password = "NewStrongPass456!"

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user("person@example.com", self.password, first_name="Ana")

    def post(self, path, data):
        return self.client.post(f"/api/auth/{path}/", data, format="json")

    def credentials(self, generator, user=None):
        user = user or self.user
        return {"uid": urlsafe_base64_encode(force_bytes(user.pk)), "token": generator.make_token(user)}

    def reset_payload(self, **changes):
        return {
            **self.credentials(password_recovery_token),
            "password": self.new_password,
            "password_confirm": self.new_password,
            **changes,
        }

    def verify_user(self):
        self.user.is_email_verified = True
        self.user.save()

    def emailed_credentials(self, expected_path):
        message = mail.outbox[-1]
        link = next(line for line in message.body.splitlines() if line.startswith("https://"))
        parsed = urlsplit(link)
        self.assertEqual(parsed.netloc, "app.example.com")
        self.assertEqual(parsed.path, expected_path)
        self.assertEqual(message.to, [self.user.email])
        self.assertNotIn(self.password, message.body)
        return {key: values[0] for key, values in parse_qs(parsed.query).items()}

    def test_registration_sends_link_and_requires_verification(self):
        response = self.post("register", {
            "email": "NewPerson@Example.com", "first_name": "Nuevo",
            "password": self.password, "password_confirm": self.password,
            "is_email_verified": True,
        })
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["verification_email_sent"])
        self.assertNotIn("access", response.data)
        self.assertNotIn("password", response.data)
        self.user = User.objects.get(email="newperson@example.com")
        self.assertFalse(self.user.is_email_verified)
        credentials = self.emailed_credentials("/verify-email")
        blocked = self.post("login", {"email": self.user.email, "password": self.password})
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.data["code"], "email_not_verified")
        wrong_password = self.post("login", {"email": self.user.email, "password": "incorrect"})
        self.assertEqual(wrong_password.status_code, 401)
        self.assertNotIn("email_not_verified", str(wrong_password.data))
        self.assertEqual(self.post("verify-email", credentials).status_code, 200)
        login = self.post("login", {"email": "NEWPERSON@example.com", "password": self.password})
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.data["user"]["is_email_verified"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        self.assertEqual(self.post("token/refresh", {"refresh": login.data["refresh"]}).status_code, 200)

    def test_verification_is_single_use_and_audited(self):
        data = self.credentials(email_verification_token)
        self.assertEqual(self.post("verify-email", data).status_code, 200)
        self.assertEqual(self.post("verify-email", data).status_code, 400)
        self.assertEqual(AuditLog.objects.filter(action="auth.email_verified").count(), 1)

    def test_get_does_not_consume_verification(self):
        data = self.credentials(email_verification_token)
        self.assertEqual(self.client.get("/api/auth/verify-email/", data).status_code, 405)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)
        self.assertEqual(self.post("verify-email", data).status_code, 200)

    def test_expired_links_are_rejected_for_both_flows(self):
        now = datetime(2026, 1, 1)
        for generator, path in [(email_verification_token, "verify-email"), (password_recovery_token, "password-reset/confirm")]:
            with self.subTest(path=path), patch.object(generator, "_now", return_value=now):
                data = self.credentials(generator)
                data.update(password=self.new_password, password_confirm=self.new_password)
                with patch.object(generator, "_now", return_value=now + timedelta(seconds=1801)):
                    self.assertEqual(self.post(path, data).status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)
        self.assertTrue(self.user.check_password(self.password))

    def test_tokens_cannot_be_used_for_the_other_purpose(self):
        self.assertEqual(self.post("verify-email", self.credentials(password_recovery_token)).status_code, 400)
        data = self.reset_payload(**self.credentials(email_verification_token))
        self.assertEqual(self.post("password-reset/confirm", data).status_code, 400)

    def test_invalid_and_wrong_user_links_are_rejected(self):
        other = User.objects.create_user("other@example.com", self.password)
        for changes in [
            {"token": "broken"}, {"uid": "%%%"}, {"uid": ""},
            {"uid": urlsafe_base64_encode(b"99999999999999999999999999999999999999")},
            {"uid": urlsafe_base64_encode(force_bytes(other.pk))},
        ]:
            with self.subTest(changes=changes):
                self.assertEqual(self.post("verify-email", {**self.credentials(email_verification_token), **changes}).status_code, 400)
                self.assertEqual(self.post("password-reset/confirm", self.reset_payload(**changes)).status_code, 400)

    def test_unknown_inactive_and_known_email_requests_have_same_response(self):
        inactive = User.objects.create_user("inactive@example.com", self.password, is_active=False)
        for path in ["password-reset", "resend-verification"]:
            results = [self.post(path, {"email": email}) for email in [self.user.email, "unknown@example.com", inactive.email]]
            self.assertTrue(all(response.status_code == 200 for response in results))
            self.assertEqual(results[0].data, results[1].data)
            self.assertEqual(results[1].data, results[2].data)
        self.assertEqual(len(mail.outbox), 2)

    def test_resend_link_works_and_verified_users_receive_no_verification_email(self):
        self.assertEqual(self.post("resend-verification", {"email": " PERSON@EXAMPLE.COM "}).status_code, 200)
        data = self.emailed_credentials("/verify-email")
        self.assertEqual(self.post("verify-email", data).status_code, 200)
        self.post("resend-verification", {"email": self.user.email})
        self.assertEqual(len(mail.outbox), 1)

    def test_reset_from_email_changes_password_and_revokes_both_jwts(self):
        self.verify_user()
        refresh = LoginSerializer.get_token(self.user)
        access = str(refresh.access_token)
        self.post("password-reset", {"email": self.user.email})
        data = self.emailed_credentials("/reset-password")
        data.update(password=self.new_password, password_confirm=self.new_password)
        self.assertEqual(self.post("password-reset/confirm", data).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))
        self.assertTrue(self.user.is_email_verified)
        self.assertEqual(self.post("password-reset/confirm", data).status_code, 400)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.assertEqual(self.post("token/refresh", {"refresh": str(refresh)}).status_code, 401)
        self.assertEqual(self.post("login", {"email": self.user.email, "password": self.password}).status_code, 401)
        self.assertEqual(self.post("login", {"email": self.user.email, "password": self.new_password}).status_code, 200)
        audit = AuditLog.objects.get(action="auth.password_reset")
        self.assertEqual(audit.details, {})

    def test_reset_does_not_verify_email_or_grant_session(self):
        response = self.post("password-reset/confirm", self.reset_payload())
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("access", response.data)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

    def test_password_validation_and_confirmation_do_not_consume_token(self):
        credentials = self.credentials(password_recovery_token)
        for password, confirmation in [("12345678", "12345678"), ("short", "short"), (self.new_password, "OtherPass123!")]:
            with self.subTest(password=password):
                result = self.post("password-reset/confirm", {**credentials, "password": password, "password_confirm": confirmation})
                self.assertEqual(result.status_code, 400)
        self.assertEqual(self.post("password-reset/confirm", self.reset_payload(**credentials)).status_code, 200)

    def test_password_spaces_are_preserved(self):
        password = " StrongPass123! "
        result = self.post("password-reset/confirm", self.reset_payload(password=password, password_confirm=password))
        self.assertEqual(result.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(password))
        self.assertFalse(self.user.check_password(password.strip()))

    def test_unverified_jwts_are_rejected_at_access_and_refresh(self):
        refresh = RefreshToken.for_user(self.user)
        refresh["email"] = self.user.email
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.assertEqual(self.post("token/refresh", {"refresh": str(refresh)}).status_code, 401)

    def test_deleted_account_refresh_is_rejected_without_server_error(self):
        self.verify_user()
        refresh = LoginSerializer.get_token(self.user)
        self.user.delete()
        self.assertEqual(self.post("token/refresh", {"refresh": str(refresh)}).status_code, 401)

    def test_inactive_account_cannot_consume_existing_links(self):
        verification = self.credentials(email_verification_token)
        recovery = self.reset_payload()
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.post("verify-email", verification).status_code, 400)
        self.assertEqual(self.post("password-reset/confirm", recovery).status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_unusable_password_account_does_not_receive_reset_email(self):
        self.user.set_unusable_password()
        self.user.save()
        self.post("password-reset", {"email": self.user.email})
        self.assertEqual(len(mail.outbox), 0)

    def test_email_changes_require_verification_and_invalidate_old_links_and_jwts(self):
        self.verify_user()
        refresh = LoginSerializer.get_token(self.user)
        old_link = self.reset_payload()
        serializer = UserAdminUpdateSerializer(self.user, data={"email": "changed@example.com"}, partial=True)
        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.assertFalse(self.user.is_email_verified)
        self.assertEqual(self.post("password-reset/confirm", old_link).status_code, 400)
        self.assertEqual(self.post("token/refresh", {"refresh": str(refresh)}).status_code, 401)
        # Incluso después de verificar la nueva dirección, el JWT anterior no revive.
        self.verify_user()
        self.assertEqual(self.post("token/refresh", {"refresh": str(refresh)}).status_code, 401)

    def test_recipient_throttle_normalizes_email_and_applies_across_ips(self):
        for index in range(5):
            result = self.client.post("/api/auth/password-reset/", {"email": "UNKNOWN@example.com"}, format="json", REMOTE_ADDR=f"192.0.2.{index}")
            self.assertEqual(result.status_code, 200)
        result = self.client.post("/api/auth/resend-verification/", {"email": "unknown@example.com"}, format="json", REMOTE_ADDR="192.0.2.100")
        self.assertEqual(result.status_code, 429)

    def test_ip_throttle_limits_requests_to_different_addresses(self):
        for index in range(30):
            self.assertEqual(self.post("password-reset", {"email": f"unknown{index}@example.com"}).status_code, 200)
        self.assertEqual(self.post("password-reset", {"email": "another@example.com"}).status_code, 429)

    def test_email_validation(self):
        for path in ["password-reset", "resend-verification"]:
            self.assertEqual(self.post(path, {"email": "invalid"}).status_code, 400)
            self.assertEqual(self.post(path, ["person@example.com"]).status_code, 400)

    @patch("users.emails.EmailMessage.send", side_effect=SMTPException("unavailable"))
    def test_mail_failure_keeps_registration_available_for_resending(self, send):
        with self.assertLogs("users.emails", level="ERROR"):
            result = self.post("register", {"email": "mailfailure@example.com", "password": self.password, "password_confirm": self.password})
        self.assertEqual(result.status_code, 201)
        self.assertFalse(result.data["verification_email_sent"])
        self.assertTrue(User.objects.filter(email="mailfailure@example.com").exists())
        with self.assertLogs("users.emails", level="ERROR"):
            known = self.post("password-reset", {"email": self.user.email})
        unknown = self.post("password-reset", {"email": "unknown@example.com"})
        self.assertEqual(known.data, unknown.data)

    @override_settings(ALLOWED_HOSTS=["testserver", "evil.example"])
    def test_email_links_ignore_untrusted_host_and_redirect_fields(self):
        self.client.post("/api/auth/password-reset/", {"email": self.user.email, "redirect_url": "https://evil.example"}, format="json", HTTP_HOST="evil.example")
        self.emailed_credentials("/reset-password")
