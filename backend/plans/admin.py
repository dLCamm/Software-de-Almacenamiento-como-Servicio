from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Plan, PlanBenefit


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