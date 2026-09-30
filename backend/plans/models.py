from django.db import models

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
    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name="benefits")

    description = models.CharField(
        max_length=150)

    order = models.PositiveIntegerField(
        default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.plan.name} - {self.description}"