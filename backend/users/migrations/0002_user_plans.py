from django.db import migrations, models
import django.db.models.deletion


FREE = "free"
PLAN_CATALOG = (
    (FREE, "FREE", 5 * 1024**3, "0.00"),
    ("pro", "PRO", 50 * 1024**3, "149.00"),
    ("business", "BUSINESS", 500 * 1024**3, "399.00"),
)


def create_plans_and_assign_free(apps, schema_editor):
    Plan = apps.get_model("users", "Plan")
    User = apps.get_model("users", "User")
    for code, name, storage_limit_bytes, monthly_price in PLAN_CATALOG:
        Plan.objects.using(schema_editor.connection.alias).get_or_create(
            code=code,
            defaults={
                "name": name,
                "storage_limit_bytes": storage_limit_bytes,
                "monthly_price": monthly_price,
                "is_active": True,
            },
        )
    free_plan = Plan.objects.using(schema_editor.connection.alias).get(code=FREE)
    User.objects.using(schema_editor.connection.alias).filter(plan__isnull=True).update(plan=free_plan)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Plan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(choices=[("free", "FREE"), ("pro", "PRO"), ("business", "BUSINESS")], max_length=20, unique=True)),
                ("name", models.CharField(max_length=50)),
                ("storage_limit_bytes", models.BigIntegerField()),
                ("monthly_price", models.DecimalField(decimal_places=2, max_digits=8)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["monthly_price"]},
        ),
        migrations.AddField(
            model_name="user",
            name="plan",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name="users", to="users.plan", verbose_name="Plan actual"),
        ),
        migrations.AddField(
            model_name="user",
            name="pending_plan",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="users_with_pending_plan", to="users.plan", verbose_name="Plan pendiente de pago"),
        ),
        migrations.RunPython(create_plans_and_assign_free, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="plan",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="users", to="users.plan", verbose_name="Plan actual"),
        ),
    ]
