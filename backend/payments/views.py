from django.shortcuts import render
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from plans.models import Plan, Subscription
from .models import Payment
from rest_framework.generics import ListAPIView
from .serializers import (
    ChangePlanSerializer,
    RenewSubscriptionSerializer,
    PaymentSerializer,
)
from .services.mock_gateway import MockPaymentGateway

class ChangePlanView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = ChangePlanSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        plan_id = serializer.validated_data["plan_id"]

        card = serializer.validated_data["card"]

        # Buscar plan
        try:
            new_plan = Plan.objects.get(
                id=plan_id,
                is_active=True
            )

        except Plan.DoesNotExist:

            return Response(
                {
                    "detail":
                    "El plan seleccionado no existe."
                },
                status=status.HTTP_404_NOT_FOUND
            )


        # Obtener suscripción actual
        try:
            subscription = request.user.subscription

        except Subscription.DoesNotExist:

            return Response(
                {
                    "detail":
                    "El usuario no tiene una suscripción."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mismo plan
        if subscription.plan_id == new_plan.id:

            return Response(
                {
                    "detail":
                    "Ya tienes este plan. "
                    "Utiliza la opción de renovación."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

 
        # FREE

        if new_plan.price == 0:

            subscription.plan = new_plan
            subscription.start_date = timezone.now()
            subscription.end_date = None
            subscription.status = "ACTIVE"
            subscription.auto_renew = False
            subscription.save()

            return Response({
                "detail": "Plan gratuito activado.",
                "plan": new_plan.name
            })

  
        # Pago simulado

        result = MockPaymentGateway.process_payment(
            amount=new_plan.price,
            card_number=card["card_number"]
        )


        # Guardar operación
    

        with transaction.atomic():

            subscription = (
                Subscription.objects
                .select_for_update()
                .get(user=request.user)
            )

            payment = Payment.objects.create(
                user=request.user,
                subscription=subscription,
                plan=new_plan,
                amount=new_plan.price,
                payment_type="SUBSCRIPTION",
                status=result.status,
                payment_method="MOCK_CARD",
                transaction_reference=result.reference,
                failure_reason=result.reason
            )

     
            # Pago rechazado

            if not result.approved:

                return Response(
                    {
                        "detail": result.message,
                        "reason": result.reason,
                        "transaction_reference":
                            result.reference
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

    
            # Pago aprobado

            subscription.plan = new_plan

            subscription.start_date = (
                timezone.now()
            )

            subscription.end_date = (
                timezone.now()
                + timedelta(days=30)
            )

            subscription.status = "ACTIVE"

            subscription.save()

        return Response(
            {
                "detail":
                    "Plan contratado correctamente.",

                "plan": new_plan.name,

                "amount": str(
                    new_plan.price
                ),

                "transaction_reference":
                    payment.transaction_reference,

                "end_date":
                    subscription.end_date
            },
            status=status.HTTP_200_OK
        )

class PaymentHistoryView(ListAPIView):

    permission_classes = [IsAuthenticated]

    serializer_class = PaymentSerializer

    def get_queryset(self):

        return (
            Payment.objects
            .filter(user=self.request.user)
            .select_related("plan")
            .order_by("-created_at")
        )

class RenewSubscriptionView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = RenewSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        card = serializer.validated_data["card"]

        try:
            subscription = request.user.subscription

        except Subscription.DoesNotExist:

            return Response(
                {
                    "detail":
                    "El usuario no tiene suscripción."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        plan = subscription.plan

        # FREE no necesita renovación
        if plan.price == 0:

            return Response(
                {
                    "detail":
                    "El plan FREE no requiere renovación."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        result = MockPaymentGateway.process_payment(
            amount=plan.price,
            card_number=card["card_number"]
        )

        with transaction.atomic():

            subscription = (
                Subscription.objects
                .select_for_update()
                .get(user=request.user)
            )

            payment = Payment.objects.create(
                user=request.user,
                subscription=subscription,
                plan=plan,
                amount=plan.price,
                payment_type="RENEWAL",
                status=result.status,
                payment_method="MOCK_CARD",
                transaction_reference=result.reference,
                failure_reason=result.reason
            )

            if not result.approved:

                return Response(
                    {
                        "detail": result.message,
                        "reason": result.reason
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            now = timezone.now()

            # Si todavía no venció:
            if (
                subscription.end_date
                and subscription.end_date > now
            ):

                base_date = subscription.end_date

            else:

                base_date = now

            subscription.end_date = (
                base_date
                + timedelta(days=30)
            )

            subscription.status = "ACTIVE"

            subscription.save()

        return Response({
            "detail":
                "Plan renovado correctamente.",

            "plan":
                subscription.plan.name,

            "new_end_date":
                subscription.end_date,

            "transaction_reference":
                payment.transaction_reference
        })

    