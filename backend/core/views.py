from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import AuditLog
from core.serializers import AuditLogSerializer
from payments.models import Payment
from storage.models import Archivo, EstadoElemento
from users.permissions import IsAdministrator


User = get_user_model()


class AdminAuditPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminAuditLogView(ListAPIView):
    permission_classes = [IsAdministrator]
    serializer_class = AuditLogSerializer
    pagination_class = AdminAuditPagination

    def get_queryset(self):
        queryset = AuditLog.objects.select_related("actor")
        action = self.request.query_params.get("action")
        resource_type = self.request.query_params.get("resource_type")
        if action:
            queryset = queryset.filter(action=action)
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        return queryset


class AdminStatisticsView(APIView):
    permission_classes = [IsAdministrator]

    def get(self, request):
        clients = User.objects.filter(role=User.Role.CLIENT)
        role_counts = {role: 0 for role, _ in User.Role.choices}
        role_counts.update(
            {
                item["role"]: item["total"]
                for item in User.objects.values("role").annotate(total=Count("id"))
            }
        )

        approved_payments = Payment.objects.filter(status="APPROVED")
        approved_totals = approved_payments.aggregate(
            amount=Sum("amount"),
            count=Count("id"),
        )
        rejected_count = Payment.objects.filter(status="REJECTED").count()

        stored_files = Archivo.objects.filter(
            estado__in=(EstadoElemento.ACTIVO, EstadoElemento.PAPELERA),
        )
        storage_totals = stored_files.aggregate(
            file_count=Count("id"),
            used_bytes=Sum("tamano_bytes"),
        )

        return Response(
            {
                "usuarios": {
                    "total": User.objects.count(),
                    "clientes": clients.count(),
                    "clientes_activos": clients.filter(is_active=True).count(),
                    "por_rol": role_counts,
                },
                "ingresos": {
                    "total_aprobado": format(
                        approved_totals["amount"] or Decimal("0.00"),
                        ".2f",
                    ),
                    "pagos_aprobados": approved_totals["count"],
                },
                "pagos": {
                    "aprobados": approved_totals["count"],
                    "rechazados": rejected_count,
                },
                "almacenamiento": {
                    "archivos_activos_y_en_papelera": storage_totals["file_count"],
                    "usado_bytes": storage_totals["used_bytes"] or 0,
                },
            },
            status=status.HTTP_200_OK,
        )


class AdminStorageByTypeView(APIView):
    permission_classes = [IsAdministrator]

    def get(self, request):
        usage_by_extension = list(
            Archivo.objects.filter(
                estado__in=(EstadoElemento.ACTIVO, EstadoElemento.PAPELERA),
            )
            .values("extension")
            .annotate(
                archivos_count=Count("id"),
                usado_bytes=Sum("tamano_bytes"),
            )
            .order_by("extension")
        )
        return Response(
            {
                "total_usado_bytes": sum(item["usado_bytes"] for item in usage_by_extension),
                "tipos": usage_by_extension,
            },
            status=status.HTTP_200_OK,
        )


@api_view(["GET"])
def health_check(request):
    return Response(
        {
            "status": "ok",
            "service": "VaultDrive API"
        },
        status=status.HTTP_200_OK
    )