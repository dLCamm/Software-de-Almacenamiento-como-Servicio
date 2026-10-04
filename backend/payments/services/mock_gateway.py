import uuid
from dataclasses import dataclass
from decimal import Decimal

# Resultados de la simulación de pagos
@dataclass
class MockPaymentResult:
    approved: bool
    status: str
    reference: str
    message: str
    reason: str = ""


class MockPaymentGateway:

    # Tarjetas de prueba:
    APPROVED_CARD = "2222232324242525"
    INSUFFICIENT_FUNDS_CARD = "123456789123456789"

    @classmethod
    def process_payment(
        cls,
        amount: Decimal,
        card_number: str
    ) -> MockPaymentResult:

        # Quitamos espacios por si viene:
        # 1111 1111 1111 1111
        card_number = card_number.replace(" ", "")

        reference = (
            f"MOCK-{uuid.uuid4().hex[:12].upper()}"
        )

        if card_number == cls.APPROVED_CARD:

            return MockPaymentResult(
                approved=True,
                status="APPROVED",
                reference=reference,
                message="Pago aprobado correctamente."
            )

        if card_number == cls.INSUFFICIENT_FUNDS_CARD:

            return MockPaymentResult(
                approved=False,
                status="REJECTED",
                reference=reference,
                message="Pago rechazado.",
                reason="Fondos insuficientes."
            )

        return MockPaymentResult(
            approved=False,
            status="REJECTED",
            reference=reference,
            message="Pago rechazado.",
            reason="Método de pago rechazado."
        )