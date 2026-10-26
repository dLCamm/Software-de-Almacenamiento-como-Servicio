from django.urls import include, path
from .views import CurrentPlanView, CurrentPlanView, PlanListView, CurrentSubscriptionView, AdminPlanViewSet 
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("admin/plans",AdminPlanViewSet, basename="admin-plans")
urlpatterns = [
    path("plans/", PlanListView.as_view(), name="plans"),
    path("subscription/current/", CurrentSubscriptionView.as_view(), name="current-subscription"),
    path("", include(router.urls)),
    path("plans/current/", CurrentPlanView.as_view(), name="current-plan"
),
]  