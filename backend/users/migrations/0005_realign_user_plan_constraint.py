from django.db import migrations
from django.utils import timezone

CONSTRAINT = "user_plan_matches_role"


def realign_user_plan_constraint(apps, schema_editor):
    """
    Algunas bases de datos compartidas quedaron con una versión anterior de
    user_plan_matches_role (soporte con plan obligatorio). El modelo actual
    exige que ADMIN y SUPPORT no tengan plan, así que cualquier guardado de una
    cuenta de soporte fallaba (por ejemplo, al restablecer la contraseña).

    Se reemplaza la restricción por la definición del modelo y se limpian los
    planes de las cuentas internas. Es idempotente.
    """
    User = apps.get_model("users", "User")
    Subscription = apps.get_model("plans", "Subscription")
    alias = schema_editor.connection.alias
    is_postgres = schema_editor.connection.vendor == "postgresql"

    if is_postgres:
        schema_editor.execute(
            "ALTER TABLE {} DROP CONSTRAINT IF EXISTS {}".format(
                schema_editor.quote_name(User._meta.db_table),
                schema_editor.quote_name(CONSTRAINT),
            )
        )

    internal = User.objects.using(alias).filter(role__in=["ADMIN", "SUPPORT"])
    internal.update(plan=None, pending_plan=None)
    Subscription.objects.using(alias).filter(user_id__in=internal.values("pk")).exclude(
        status="CANCELLED", auto_renew=False,
    ).update(status="CANCELLED", auto_renew=False, updated_at=timezone.now())

    if is_postgres:
        constraint = next(c for c in User._meta.constraints if c.name == CONSTRAINT)
        schema_editor.add_constraint(User, constraint)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_internal_accounts_without_plans"),
        ("plans", "0005_planbenefit_feature"),
    ]

    operations = [
        migrations.RunPython(realign_user_plan_constraint, migrations.RunPython.noop),
    ]
