from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class PlanFeatureMigrationTests(TransactionTestCase):
    def test_existing_benefits_are_mapped_without_granting_free_features(self):
        before = [("plans", "0004_alter_planbenefit_plan")]
        after = [("plans", "0005_planbenefit_feature")]
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        self.addCleanup(lambda: MigrationExecutor(connection).migrate(latest))
        executor.migrate(before)
        old_apps = executor.loader.project_state(before).apps
        Plan = old_apps.get_model("users", "Plan")
        Benefit = old_apps.get_model("plans", "PlanBenefit")
        free, _ = Plan.objects.get_or_create(code="free", defaults={"name": "FREE", "storage_limit_bytes": 1024**3, "monthly_price": 0})
        pro, _ = Plan.objects.get_or_create(code="pro", defaults={"name": "PRO", "storage_limit_bytes": 50 * 1024**3, "monthly_price": 149})
        Benefit.objects.filter(plan=pro).delete()
        Benefit.objects.create(plan=pro, description="Compartir archivos", order=1)
        Benefit.objects.create(plan=pro, description="Compartir enlaces", order=2)
        Benefit.objects.create(plan=pro, description="Archivos temporales", order=3)
        Benefit.objects.create(plan=free, description="Archivos temporales")
        Benefit.objects.create(plan=free, description="Compartir enlaces")
        retained = Benefit.objects.create(plan=free, description="Gestión de archivos")
        custom = Plan.objects.create(code="archive", name="Archive", storage_limit_bytes=1024, monthly_price=10)
        Benefit.objects.create(plan=custom, description="Archivos temporales con autoeliminación")

        executor = MigrationExecutor(connection)
        executor.migrate(after)
        apps = executor.loader.project_state(after).apps
        Benefit = apps.get_model("plans", "PlanBenefit")
        self.assertEqual(set(Benefit.objects.filter(plan_id=pro.pk).values_list("feature", flat=True)), {"temporary_files", "share_links"})
        self.assertEqual(Benefit.objects.filter(plan_id=pro.pk).count(), 2)
        self.assertEqual(list(Benefit.objects.filter(plan_id=free.pk).values_list("id", flat=True)), [retained.pk])
        self.assertEqual(Benefit.objects.get(plan_id=custom.pk).feature, "temporary_files")
