from django.urls import path
from .views import PlanListView, CurrentSubscriptionView

urlpatterns = [
    path("", PlanListView.as_view(), name="plan-list"),
    path("subscription/current/", CurrentSubscriptionView.as_view(), name="current-subscription"),
]