from django.urls import path
from storage.views import (
    FileDetailView,
    FileDownloadView,
    FileListView,
    FileShareView,
    FileUploadView,
    FolderDetailView,
    FolderListCreateView,
    StorageUsageView,
)

app_name = "storage"

urlpatterns = [
    # Archivos
    path("files/upload/", FileUploadView.as_view(), name="file-upload"),
    path("files/", FileListView.as_view(), name="file-list"),
    path("files/<uuid:file_id>/", FileDetailView.as_view(), name="file-detail"),
    path("files/<uuid:file_id>/download/", FileDownloadView.as_view(), name="file-download"),
    path("files/<uuid:file_id>/share/", FileShareView.as_view(), name="file-share"),

    # Carpetas
    path("folders/", FolderListCreateView.as_view(), name="folder-list-create"),
    path("folders/<uuid:folder_id>/", FolderDetailView.as_view(), name="folder-detail"),

    # Espacio y Cuotas
    path("usage/", StorageUsageView.as_view(), name="storage-usage"),
]
