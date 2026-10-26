from django.db.models.deletion import ProtectedError
from django.utils import timezone
import math

from rest_framework import status, viewsets
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import Plan

from .models import Subscription
from .permissions import IsAdministrator
from .serializers import (PlanSerializer,SubscriptionSerializer,PlanAdminSerializer,)

class PlanListView(ListAPIView):

    serializer_class = PlanSerializer

    def get_queryset(self):

        return (
            Plan.objects
            .filter(is_active=True)
            .prefetch_related("benefits")
            .order_by("monthly_price")
        )


class CurrentSubscriptionView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):

        user = request.user
        plan = user.plan

        try:
            subscription = user.subscription

        except Subscription.DoesNotExist:

            return Response(
                {
                    "detail":
                        "El usuario no tiene una suscripción."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        days_remaining = None
        is_expired = False

        if subscription.end_date:

            remaining = (
                subscription.end_date
                - timezone.now()
            )

            if remaining.total_seconds() <= 0:

                days_remaining = 0
                is_expired = True

            else:

                days_remaining = math.ceil(
                    remaining.total_seconds()
                    / 86400
                )

        return Response(
            {
                "plan": {
                    "id":
                        plan.id,

                    "code":
                        plan.code,

                    "name":
                        plan.name,

                    "monthly_price":
                        str(plan.monthly_price),

                    "storage_limit_bytes":
                        plan.storage_limit_bytes,

                    "storage_limit_gb":
                        round(
                            plan.storage_limit_bytes
                            / (1024 ** 3),
                            2
                        ),

                    "is_active":
                        plan.is_active,

                    "benefits": [
                        {
                            "id": benefit.id,
                            "description":
                                benefit.description,
                            "order":
                                benefit.order,
                        }
                        for benefit
                        in plan.benefits.all()
                    ],
                },

                "subscription": {
                    "start_date":
                        subscription.start_date,

                    "end_date":
                        subscription.end_date,

                    "status":
                        subscription.status,

                    "auto_renew":
                        subscription.auto_renew,

                    "days_remaining":
                        days_remaining,

                    "is_expired":
                        is_expired,
                }
            }
        )



class AdminPlanViewSet(viewsets.ModelViewSet):

    serializer_class = PlanAdminSerializer

    permission_classes = [
        IsAdministrator
    ]

    def get_queryset(self):

        return (
            Plan.objects
            .all()
            .prefetch_related("benefits")
            .order_by("monthly_price")
        )

    def destroy(self, request, *args, **kwargs):

        plan = self.get_object()

        # No eliminar FREE
        if plan.code == Plan.FREE_CODE:

            return Response(
                {
                    "detail":
                        "El plan FREE no puede eliminarse."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            plan.delete()

        except ProtectedError:

            return Response(
                {
                    "detail":
                        "Este plan está siendo utilizado "
                        "por usuarios. Desactívalo en "
                        "lugar de eliminarlo."
                },
                status=status.HTTP_409_CONFLICT
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

class CurrentPlanView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):

        user = request.user
        plan = user.plan

        subscription = (
            Subscription.objects
            .filter(user=user)
            .first()
        )


        start_date = None
        end_date = None
        auto_renew = False
        subscription_status = "ACTIVE"
        days_remaining = None
        is_expired = False


        #Si tiene la suscripcion
        if subscription:

            start_date = subscription.start_date
            end_date = subscription.end_date
            auto_renew = subscription.auto_renew
            subscription_status = subscription.status

            if end_date:

                now = timezone.now()

                remaining = end_date - now

                is_expired = (
                    remaining.total_seconds() <= 0
                )

                if is_expired:

                    days_remaining = 0

                else:

                    # ceil para que, por ejemplo,
                    # 2.4 días muestre 3 días restantes
                    import math

                    days_remaining = math.ceil(
                        remaining.total_seconds()
                        / 86400
                    )


        if plan.code == Plan.FREE_CODE:

            end_date = None
            days_remaining = None
            is_expired = False

        return Response({

            "plan": {
                "id":
                    plan.id,

                "code":
                    plan.code,

                "name":
                    plan.name,

                "monthly_price":
                    str(plan.monthly_price),

                "storage_limit_bytes":
                    plan.storage_limit_bytes,

                "storage_limit_gb":
                    round(
                        plan.storage_limit_bytes
                        / (1024 ** 3),
                        2
                    ),

                "is_active":
                    plan.is_active,
            },

            "subscription": {
                "start_date":
                    start_date,

                "end_date":
                    end_date,

                "status":
                    subscription_status,

                "auto_renew":
                    auto_renew,

                "days_remaining":
                    days_remaining,

                "is_expired":
                    is_expired,
            }
        })