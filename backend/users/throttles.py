from collections.abc import Mapping

from django.utils.crypto import salted_hmac
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class PasswordChangeThrottle(UserRateThrottle):
    scope = "password_change"


class AuthEmailIPThrottle(SimpleRateThrottle):
    scope = "auth_email_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class AuthEmailRecipientThrottle(SimpleRateThrottle):
    scope = "auth_email_recipient"

    def get_cache_key(self, request, view):
        if not isinstance(request.data, Mapping):
            return None
        email = request.data.get("email")
        if not isinstance(email, str) or not email.strip():
            return None
        ident = salted_hmac(self.scope, email.strip().lower()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": ident}
