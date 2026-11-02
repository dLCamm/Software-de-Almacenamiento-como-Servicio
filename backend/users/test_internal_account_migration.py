from datetime import timedelta

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone


class InternalAccountMigrationTests(TransactionTestCase):
    def test_existing_internal_accounts_lose_plans_without_deleting_history(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        before = [node for node in latest if node[0] != "users"] + [("users", "0003_alter_plan_code")]
        self.addCleanup(lambda: MigrationExecutor(connection).migrate(latest))
        executor.migrate(before)
        old = executor.loader.project_state(before).apps
        Plan = old.get_model("users", "Plan")
        User = old.get_model("users", "User")
        Subscription = old.get_model("plans", "Subscription")
        Payment = old.get_model("payments", "Payment")
        Archivo = old.get_model("storage", "Archivo")
        Plan.objects.get_or_create(code="free", defaults={"name": "FREE", "storage_limit_bytes": 1024**3, "monthly_price": 0})
        pro, _ = Plan.objects.get_or_create(code="pro", defaults={"name": "PRO", "storage_limit_bytes": 50 * 1024**3, "monthly_price": 149})
        accounts = {}
        for role in ("ADMIN", "SUPPORT", "CLIENT"):
            user = User.objects.create(email=f"migration-{role}@example.com", role=role, plan=pro, pending_plan=pro)
            accounts[role] = user.pk
            Subscription.objects.create(user=user, status="ACTIVE", auto_renew=True, end_date=timezone.now() + timedelta(days=30))
            Payment.objects.create(user=user, plan=pro, amount=149, status="APPROVED", payment_type="SUBSCRIPTION", payment_method="MOCK_CARD", transaction_reference=f"migration-{role}")
            Archivo.objects.create(usuario=user, nombre_original="keep.pdf", extension="pdf", mime_type="application/pdf", tamano_bytes=10, bucket_minio="test", object_key=f"{role}/keep.pdf")

        executor = MigrationExecutor(connection)
        executor.migrate(latest)
        new = executor.loader.project_state(latest).apps
        User = new.get_model("users", "User")
        Subscription = new.get_model("plans", "Subscription")
        for role in ("ADMIN", "SUPPORT"):
            user = User.objects.get(pk=accounts[role])
            self.assertIsNone(user.plan_id)
            self.assertIsNone(user.pending_plan_id)
            subscription = Subscription.objects.get(user=user)
            self.assertEqual(subscription.status, "CANCELLED")
            self.assertFalse(subscription.auto_renew)
        client = User.objects.get(pk=accounts["CLIENT"])
        self.assertEqual(client.plan_id, pro.pk)
        self.assertEqual(client.pending_plan_id, pro.pk)
        self.assertEqual(Subscription.objects.get(user=client).status, "ACTIVE")
        self.assertTrue(Subscription.objects.get(user=client).auto_renew)
        self.assertEqual(new.get_model("payments", "Payment").objects.count(), 3)
        self.assertEqual(new.get_model("storage", "Archivo").objects.count(), 3)
