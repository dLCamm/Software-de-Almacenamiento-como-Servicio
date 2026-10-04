from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "plan",
        "amount",
        "payment_type",
        "status",
        "transaction_reference",
        "created_at",
    )

    list_filter = (
        "status",
        "payment_type",
        "plan",
    )

    search_fields = (
        "user__email",
        "transaction_reference",
    )

    readonly_fields = (
        "transaction_reference",
        "created_at",
    )