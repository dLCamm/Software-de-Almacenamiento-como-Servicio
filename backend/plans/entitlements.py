"""Los permisos dependen del plan contratado y de su periodo pagado vigente."""
from django.utils import timezone

from plans.models import PlanBenefit, Subscription
from users.models import Plan, User


class PlanFeatureUnavailable(Exception):
    pass


def get_plan_features(plan):
    if plan is None:
        return {feature: False for feature in PlanBenefit.Feature.values}
    enabled = {benefit.feature for benefit in plan.benefits.all() if benefit.feature}
    paid_plan = plan.code != Plan.FREE_CODE and plan.monthly_price > 0
    return {feature: paid_plan and feature in enabled for feature in PlanBenefit.Feature.values}


def get_user_features(user):
    if user.role != User.Role.CLIENT:
        return get_plan_features(None)
    features = get_plan_features(user.plan)
    if not any(features.values()):
        return features
    # Consultar la suscripción evita depender de una relación cacheada antes del pago.
    now = timezone.now()
    active = Subscription.objects.filter(
        user=user,
        status="ACTIVE",
        start_date__lte=now,
        end_date__gt=now,
    ).exists()
    return {feature: enabled and active for feature, enabled in features.items()}


def require_feature(user, feature):
    if not get_user_features(user).get(feature, False):
        label = PlanBenefit.Feature(feature).label
        raise PlanFeatureUnavailable(
            f"{label} requiere un plan de pago que incluya este beneficio "
            "y una suscripción vigente."
        )
