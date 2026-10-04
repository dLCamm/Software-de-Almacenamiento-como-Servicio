from django.urls import path

from .views import ChangePlanView, PaymentHistoryView, RenewSubscriptionView

urlpatterns = [
    path("change-plan/", ChangePlanView.as_view(), name="change-plan"),
    path("history/", PaymentHistoryView.as_view(), name="payment-history"),
    path("renew/", RenewSubscriptionView.as_view(), name="renew-subscription"),
]
