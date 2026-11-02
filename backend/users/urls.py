from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .views import (RegisterView, LoginView, CurrentUserView, SupportUserCreateView, UserManagementDetailView, UserManagementListView, UserManagementUpdateView, UserStatusView,)
from .account_views import (
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ResendVerificationView,
    VerifyEmailView,
)


urlpatterns = [
    path("register/", RegisterView.as_view(),name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("password-change/", PasswordChangeView.as_view(), name="password-change"),

    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("management/users/", UserManagementListView.as_view(), name="management-user-list"),
    path("management/support/", SupportUserCreateView.as_view(), name="management-support-create"),
    path("management/<int:user_id>/", UserManagementDetailView.as_view(), name="management-user-detail"),
    path("management/<int:user_id>/edit/", UserManagementUpdateView.as_view(), name="management-user-update"),
    path("management/<int:user_id>/status/", UserStatusView.as_view(), name="management-user-status"),
]
