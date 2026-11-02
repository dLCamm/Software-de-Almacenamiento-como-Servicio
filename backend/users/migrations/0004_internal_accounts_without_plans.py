from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


def detach_internal_plans(apps, schema_editor):
    User = apps.get_model("users", "User")
    Subscription = apps.get_model("plans", "Subscription")
    alias = schema_editor.connection.alias
    internal = User.objects.using(alias).filter(role__in=["ADMIN", "SUPPORT"])
    internal.update(plan=None, pending_plan=None)
    Subscription.objects.using(alias).filter(user_id__in=internal.values("pk")).update(
        status="CANCELLED", auto_renew=False, updated_at=timezone.now(),
    )


def restore_required_plans(apps, schema_editor):
    User = apps.get_model("users", "User")
    Plan = apps.get_model("users", "Plan")
    alias = schema_editor.connection.alias
    if not User.objects.using(alias).filter(plan__isnull=True).exists():
        return
    free = Plan.objects.using(alias).get(code="free")
    User.objects.using(alias).filter(plan__isnull=True).update(plan=free)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_alter_plan_code"),
        ("plans", "0005_planbenefit_feature"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user", name="plan",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name="users", to="users.plan", verbose_name="Plan actual",
            ),
        ),
        migrations.RunPython(detach_internal_plans, restore_required_plans),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.CheckConstraint(
                condition=(models.Q(role="CLIENT", plan__isnull=False)
                           | models.Q(role__in=["ADMIN", "SUPPORT"], plan__isnull=True, pending_plan__isnull=True)),
                name="user_plan_matches_role",
            ),
        ),
    ]
