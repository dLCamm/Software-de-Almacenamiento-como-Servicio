from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Plan, PlanBenefit, Subscription


class PlanBenefitInline(admin.TabularInline):
    model = PlanBenefit
    extra = 1


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "price",
        "storage_gb",
        "is_active",
        "is_popular",
    )

    list_filter = (
        "is_active",
        "is_popular",
    )

    search_fields = (
        "name",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }

    inlines = [
        PlanBenefitInline
    ]


@admin.register(PlanBenefit)
class PlanBenefitAdmin(admin.ModelAdmin):
    list_display = (
        "plan",
        "description",
        "order"
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
    )

    search_fields = (
        "user__email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    @admin.display(
        description="Plan actual"
    )
    def get_plan(self, obj):

        if obj.user.plan:
            return obj.user.plan.name

        return "Sin plan"