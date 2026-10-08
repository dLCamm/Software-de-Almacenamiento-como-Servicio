from django.core.management.base import BaseCommand

from plans.models import Plan, PlanBenefit


class Command(BaseCommand):
    help = "Crea los planes iniciales del sistema"

    def handle(self, *args, **options):

        plans_data = [
            {
                "name": "FREE",
                "slug": "free",
                "price": 0,
                "storage_gb": 5,
                "description": "Para comenzar a almacenar tus archivos.",
                "is_popular": False,
                "benefits": [
                    "5 GB de almacenamiento",
                    "Gestión de archivos",
                    "Gestión de carpetas",
                ],
            },
            {
                "name": "PRO",
                "slug": "pro",
                "price": 149,
                "storage_gb": 50,
                "description": "Más espacio para tus archivos y proyectos.",
                "is_popular": True,
                "benefits": [
                    "50 GB de almacenamiento",
                    "Gestión de archivos",
                    "Gestión de carpetas",
                    "Compartir archivos",
                    "Archivos temporales",
                ],
            },
            {
                "name": "BUSINESS",
                "slug": "business",
                "price": 399,
                "storage_gb": 500,
                "description": "Almacenamiento para grandes necesidades.",
                "is_popular": False,
                "benefits": [
                    "500 GB de almacenamiento",
                    "Gestión de archivos",
                    "Gestión de carpetas",
                    "Compartir archivos",
                    "Archivos temporales",
                    "Mayor capacidad de almacenamiento",
                ],
            },
        ]

        for plan_data in plans_data:

            benefits = plan_data.pop("benefits")

            plan, created = Plan.objects.update_or_create(
                slug=plan_data["slug"],
                defaults=plan_data
            )

            PlanBenefit.objects.filter(
                plan=plan
            ).delete()

            for index, benefit in enumerate(benefits):
                PlanBenefit.objects.create(
                    plan=plan,
                    description=benefit,
                    order=index
                )

            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Plan {plan.name} creado"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Plan {plan.name} actualizado"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Planes cargados correctamente."
            )
        )