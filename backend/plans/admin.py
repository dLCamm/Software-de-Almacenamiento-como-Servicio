from django.contrib import admin

from .models import PlanBenefit, Subscription


@admin.register(PlanBenefit)
class PlanBenefitAdmin(admin.ModelAdmin):

    list_display = (
        "plan",
        "description",
        "order",
    )

    list_filter = (
        "plan",
    )

    search_fields = (
        "plan__name",
        "description",
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "get_plan",
        "status",
        "start_date",
        "end_date",
        "auto_renew",
    )

    list_filter = (
        "status",
        "auto_renew",
        "user__plan",
    )

    search_fields = (
        "user__email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    @admin.display(
        description="Plan actual",
        ordering="user__plan__name"
    )
    def get_plan(self, obj):

        if obj.user.plan:
            return obj.user.plan.name

        return "Sin plan"