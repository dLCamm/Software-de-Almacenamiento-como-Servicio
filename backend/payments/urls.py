from django.urls import path

from .views import ChangePlanView, GlobalPaymentHistoryView, PaymentHistoryView, PaymentManagementDetailView, RenewSubscriptionView, UserPaymentHistoryView

urlpatterns = [
    path("change-plan/", ChangePlanView.as_view(), name="change-plan"),
    path("history/", PaymentHistoryView.as_view(), name="payment-history"),
    path("renew/", RenewSubscriptionView.as_view(), name="renew-subscription"),
    path("management/", GlobalPaymentHistoryView.as_view(), name="global-payment-history"),
    path("management/user/<int:user_id>/", UserPaymentHistoryView.as_view(), name="user-payment-history"),
    path("management/<int:payment_id>/", PaymentManagementDetailView.as_view(), name="payment-management-detail"),
]
