from django.db import models

# Create your models here.
from django.conf import settings
from django.db import models


class Payment(models.Model):

    # Estados posibles de un pago
    STATUS_CHOICES = [
        ("APPROVED", "Aprobado"),
        ("REJECTED", "Rechazado"),
    ]

    TYPE_CHOICES = [
        ("SUBSCRIPTION", "Contratación"),
        ("RENEWAL", "Renovación"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments"
    )

    subscription = models.ForeignKey(
        "plans.Subscription",
        on_delete=models.PROTECT,
        related_name="payments"
    )

    plan = models.ForeignKey(
        "plans.Plan",
        on_delete=models.PROTECT,
        related_name="payments"
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    payment_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES
    )

    payment_method = models.CharField(
        max_length=50,
        default="MOCK_CARD"
    )

    transaction_reference = models.CharField(
        max_length=100,
        unique=True
    )

    failure_reason = models.CharField(
        max_length=150,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            f"{self.user} - "
            f"{self.plan.name} - "
            f"{self.status}"
        )