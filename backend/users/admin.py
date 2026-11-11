from django.contrib import admin

# Register your models here.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from plans.models import PlanBenefit
from .models import Plan, User


class PlanBenefitInline(admin.TabularInline):

    model = PlanBenefit

    extra = 1

    fields = (
        "description",
        "order",
    )

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "code",
        "monthly_price",
        "get_storage_gb",
        "is_active",
    )

    list_filter = (
        "is_active",
    )

    search_fields = (
        "name",
        "code",
    )

    inlines = [
        PlanBenefitInline
    ]

    @admin.display(
        description="Almacenamiento (GB)"
    )
    def get_storage_gb(self, obj):

        return round(
            obj.storage_limit_bytes
            / (1024 ** 3),
            2
        )


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    model = User

    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "plan",
        "is_active",
        "is_staff",
        "is_email_verified",
    )

    list_filter = (
        "role",
        "plan",
        "is_active",
        "is_staff",
        "is_email_verified",
    )

    search_fields = (
        "email",
        "first_name",
        "last_name",
    )

    ordering = ("email",)

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "email",
                    "password",
                )
            },
        ),
        (
            "Información personal",
            {
                "fields": (
                    "first_name",
                    "last_name",
                )
            },
        ),
        (
            "VaultDrive",
            {
                "fields": (
                    "role",
                    "plan",
                    "pending_plan",
                    "is_email_verified",
                )
            },
        ),
        (
            "Estado y permisos",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Fechas",
            {
                "fields": (
                    "last_login",
                    "date_joined",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "last_login",
        "date_joined",
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "plan",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )