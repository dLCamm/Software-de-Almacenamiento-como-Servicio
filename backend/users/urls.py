from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .views import (RegisterView, LoginView, CurrentUserView, UserManagementListView,)


urlpatterns = [
    path("register/", RegisterView.as_view(),name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("management/users/", UserManagementListView.as_view(), name="management-user-list"),
]