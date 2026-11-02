import unicodedata

from django.db import migrations, models


FEATURE_LABELS = {
    "temporary_files": "Archivos temporales",
    "share_links": "Compartir enlaces",
}


def migrate_features(apps, schema_editor):
    Plan = apps.get_model("users", "Plan")
    Benefit = apps.get_model("plans", "PlanBenefit")
    alias = schema_editor.connection.alias
    for plan in Plan.objects.using(alias).all():
        seen = set()
        benefits = Benefit.objects.using(alias).filter(plan=plan).order_by("order", "id")
        for benefit in benefits:
            description = "".join(
                char for char in unicodedata.normalize("NFD", benefit.description.lower())
                if not unicodedata.combining(char)
            )
            feature = ""
            if "temporal" in description and "archivo" in description:
                feature = "temporary_files"
            elif "compart" in description and ("archivo" in description or "enlace" in description):
                feature = "share_links"
            if not feature:
                continue
            if plan.code == "free" or plan.monthly_price <= 0 or feature in seen:
                benefit.delete(using=alias)
                continue
            benefit.feature = feature
            benefit.description = FEATURE_LABELS[feature]
            benefit.save(using=alias, update_fields=["feature", "description"])
            seen.add(feature)

        # El catálogo original ofrece ambas funciones en PRO y BUSINESS.
        if plan.code in ("pro", "business") and plan.monthly_price > 0:
            last_order = benefits.aggregate(last=models.Max("order"))["last"] or 0
            for feature, label in FEATURE_LABELS.items():
                if feature not in seen:
                    last_order += 1
                    Benefit.objects.using(alias).create(
                        plan=plan, feature=feature, description=label, order=last_order,
                    )


class Migration(migrations.Migration):
    dependencies = [("plans", "0004_alter_planbenefit_plan")]

    operations = [
        migrations.AddField(
            model_name="planbenefit",
            name="feature",
            field=models.CharField(
                blank=True,
                choices=[("temporary_files", "Archivos temporales"), ("share_links", "Compartir enlaces")],
                default="",
                help_text="Función habilitada por este beneficio. Vacío para textos informativos.",
                max_length=30,
            ),
        ),
        migrations.RunPython(migrate_features, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="planbenefit",
            constraint=models.UniqueConstraint(
                condition=~models.Q(feature=""),
                fields=("plan", "feature"),
                name="unique_plan_feature",
            ),
        ),
    ]
