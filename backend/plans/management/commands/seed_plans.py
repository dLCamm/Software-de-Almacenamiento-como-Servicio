from django.core.management.base import BaseCommand
from django.db import transaction

from plans.models import PlanBenefit
from users.models import Plan


class Command(BaseCommand):
    help = "Crea los planes iniciales sin sobrescribir planes ya configurados"

    @transaction.atomic
    def handle(self, *args, **options):
        for code, name, storage_gb, price in (
            ("free", "FREE", 5, 0),
            ("pro", "PRO", 50, 149),
            ("business", "BUSINESS", 500, 399),
        ):
            plan, created = Plan.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "storage_limit_bytes": storage_gb * 1024 ** 3,
                    "monthly_price": price,
                    "is_active": True,
                },
            )
            # Las migraciones crean estos planes. Completar sus textos una sola vez.
            if created or not plan.benefits.filter(feature="").exists():
                for order, description in enumerate((
                    f"{plan.storage_limit_bytes / 1024 ** 3:g} GB de almacenamiento",
                    "Gestión de archivos",
                    "Gestión de carpetas",
                )):
                    PlanBenefit.objects.create(plan=plan, description=description, order=order)
            if created and price > 0:
                for order, feature in enumerate(PlanBenefit.Feature, start=3):
                    PlanBenefit.objects.create(
                        plan=plan, feature=feature, description=feature.label, order=order,
                    )
            self.stdout.write(self.style.SUCCESS(f"Plan {plan.name} disponible"))
