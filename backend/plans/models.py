from django.db import models

from django.conf import settings
from django.utils import timezone

# Create your models here.
from django.db import models


class Plan(models.Model):
    name = models.CharField(
        max_length=50,
        unique=True)

    slug = models.SlugField(
        max_length=50,
        unique=True)

    description = models.TextField(
        blank=True)

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0)

    storage_gb = models.PositiveIntegerField()

    is_active = models.BooleanField(
        default=True)

    is_popular = models.BooleanField(
        default=False)

    created_at = models.DateTimeField(
        auto_now_add=True)

    updated_at = models.DateTimeField(
        auto_now=True)

    class Meta:
        ordering = ["price"]

    def __str__(self):
        return self.name

class PlanBenefit(models.Model):
    class Feature(models.TextChoices):
        TEMPORARY_FILES = "temporary_files", "Archivos temporales"
        SHARE_LINKS = "share_links", "Compartir enlaces"

    plan = models.ForeignKey(
        "users.Plan",
        on_delete=models.CASCADE,
        related_name="benefits")

    description = models.CharField(
        max_length=150)

    feature = models.CharField(
        max_length=30,
        choices=Feature.choices,
        blank=True,
        default="",
        help_text="Función habilitada por este beneficio. Vacío para textos informativos.",
    )

    order = models.PositiveIntegerField(
        default=0)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["plan", "feature"],
                condition=~models.Q(feature=""),
                name="unique_plan_feature",
            ),
        ]

    def __str__(self):
        return f"{self.plan.name} - {self.description}"

class Subscription(models.Model):

    STATUS_CHOICES = [
        ("ACTIVE", "Activa"),
        ("EXPIRED", "Expirada"),
        ("CANCELLED", "Cancelada"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription"
    )

    start_date = models.DateTimeField(
        default=timezone.now
    )

    end_date = models.DateTimeField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE"
    )

    auto_renew = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.user.email} - {self.status}"
