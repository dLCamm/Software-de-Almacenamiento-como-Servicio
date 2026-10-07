from django.test import TestCase
from rest_framework.test import APIClient
from users.models import User


class UserPlanRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def register(self, email, plan_code=None):
        payload = {
            "first_name": "Ana",
            "last_name": "López",
            "email": email,
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
        }
        if plan_code:
            payload["plan_code"] = plan_code
        return self.client.post("/api/auth/register/", payload, format="json")

    def test_new_user_is_assigned_free_plan_by_default(self):
        response = self.register("free@example.com")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], "CLIENT")
        self.assertEqual(response.data["plan"]["code"], "free")
        self.assertIsNone(response.data["pending_plan"])

    def test_paid_plan_selection_remains_pending_and_does_not_raise_quota(self):
        response = self.register("pro@example.com", "pro")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["plan"]["code"], "free")
        self.assertEqual(response.data["pending_plan"]["code"], "pro")

        user = User.objects.get(email="pro@example.com")
        self.client.force_authenticate(user=user)
        usage_response = self.client.get("/api/storage/usage/")

        self.assertEqual(usage_response.status_code, 200)
        self.assertEqual(usage_response.data["maximo_bytes"], 5 * 1024**3)
        self.assertEqual(usage_response.data["plan_codigo"], "free")
        self.assertEqual(usage_response.data["plan_pendiente_codigo"], "pro")

    def test_current_user_profile_contains_only_authenticated_account(self):
        self.register("first@example.com")
        self.register("second@example.com")
        first_user = User.objects.get(email="first@example.com")
        self.client.force_authenticate(user=first_user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "first@example.com")
        self.assertEqual(response.data["plan"]["code"], "free")
        self.assertNotEqual(response.data["email"], "second@example.com")

    def test_unknown_plan_selection_is_rejected(self):
        response = self.register("invalid@example.com", "enterprise")

        self.assertEqual(response.status_code, 400)
