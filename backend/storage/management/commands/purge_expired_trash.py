import time

from django.core.management.base import BaseCommand, CommandError

from storage.services.trash_service import TrashService


class Command(BaseCommand):
    help = "Elimina de MinIO y PostgreSQL los elementos que cumplieron 30 días en papelera."

    def add_arguments(self, parser):
        parser.add_argument(
            "--loop",
            action="store_true",
            help="Repite la purga de manera continua para ejecutarse como servicio.",
        )
        parser.add_argument(
            "--interval-seconds",
            type=int,
            default=86400,
            help="Tiempo entre ejecuciones cuando se usa --loop (por defecto: 24 horas).",
        )

    def handle(self, *args, **options):
        interval = options["interval_seconds"]
        if options["loop"] and interval < 60:
            raise CommandError("--interval-seconds debe ser al menos 60.")

        while True:
            result = TrashService.purge_expired_trash()
            temporary_result = TrashService.purge_expired_temporary_files()
            self.stdout.write(
                self.style.SUCCESS(
                    "Papelera purgada: "
                    f"{result['archivos_eliminados']} archivos y "
                    f"{result['carpetas_eliminadas']} carpetas; "
                    f"{result['errores']} errores."
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    "Archivos temporales vencidos purgados: "
                    f"{temporary_result['archivos_eliminados']} archivos; "
                    f"{temporary_result['errores']} errores."
                )
            )
            if not options["loop"]:
                return
            time.sleep(interval)
