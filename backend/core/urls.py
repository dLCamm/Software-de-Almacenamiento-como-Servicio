from django.urls import path

from core.views import AdminAuditLogView, AdminStatisticsView, AdminStorageByTypeView


app_name = "core"

urlpatterns = [
    path("audit/", AdminAuditLogView.as_view(), name="admin-audit"),
    path("statistics/", AdminStatisticsView.as_view(), name="admin-statistics"),
    path(
        "statistics/storage-by-type/",
        AdminStorageByTypeView.as_view(),
        name="admin-storage-by-type",
    ),
]
