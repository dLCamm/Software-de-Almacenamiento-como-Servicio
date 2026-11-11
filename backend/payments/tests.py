from django.test import TestCase
from unittest.mock import patch

from rest_framework.test import APIClient

from core.models import AuditLog
from payments.services.mock_gateway import MockPaymentResult
from users.models import Plan, User


class PaymentAuditTests(TestCase):
    def setUp(self):
        self.free_plan = Plan.objects.get(code=Plan.FREE_CODE)
        self.paid_plan = Plan.objects.get(code="pro")
        self.user = User.objects.create_user(
            email="payment-audit@example.com",
            password="SafePassword123!",
            plan=self.free_plan,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("payments.views.MockPaymentGateway.process_payment")
    def test_successful_payment_is_audited_without_card_data(self, process_payment):
        process_payment.return_value = MockPaymentResult(
            approved=True,
            status="APPROVED",
            reference="AUDIT-PAYMENT-REF",
            message="Pago aprobado.",
        )

        response = self.client.post(
            "/api/payments/change-plan/",
            {
                "plan_id": self.paid_plan.pk,
                "card": {
                    "card_number": "0000000000000000",
                    "expiry": "12/30",
                    "cvv": "123",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        event = AuditLog.objects.get(
            actor=self.user,
            action="payment.recorded",
        )
        self.assertEqual(event.details["status"], "APPROVED")
        self.assertEqual(event.details["amount"], str(self.paid_plan.monthly_price))
        self.assertNotIn("card_number", event.details)
        plan_change = AuditLog.objects.get(
            actor=self.user,
            action="plan.changed",
        )
        self.assertEqual(
            plan_change.details,
            {"from_plan_id": self.free_plan.pk, "to_plan_id": self.paid_plan.pk},
        )
