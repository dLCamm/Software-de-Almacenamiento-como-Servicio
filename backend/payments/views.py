from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.audit import record_audit_event
from plans.models import Subscription
from users.models import Plan, User
from .models import Payment
from .serializers import (ChangePlanSerializer,RenewSubscriptionSerializer,PaymentSerializer,)
from .services.mock_gateway import MockPaymentGateway
from django.db.models import Q
from django.utils.dateparse import parse_date
from users.permissions import IsAdminOrSupport

from .models import Payment
from .serializers import PaymentManagementSerializer


# CAMBIAR / CONTRATAR PLAN

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

        user = request.user
        previous_plan_id = user.plan_id

       
        if user.plan_id == new_plan.id:

            return Response(
                {
                    "detail":
                        "Ya tienes este plan."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

 
        if new_plan.code == Plan.FREE_CODE:

            with transaction.atomic():

                user.plan = new_plan
                user.pending_plan = None

                user.save(
                    update_fields=[
                        "plan",
                        "pending_plan",
                    ]
                )

                # FREE no tiene fecha de expiración
                subscription, _ = (
                    Subscription.objects.get_or_create(
                        user=user,
                        defaults={
                            "start_date": timezone.now(),
                            "end_date": None,
                            "status": "ACTIVE",
                            "auto_renew": False,
                        }
                    )
                )

                subscription.start_date = timezone.now()
                subscription.end_date = None
                subscription.status = "ACTIVE"
                subscription.auto_renew = False

                subscription.save(
                    update_fields=[
                        "start_date",
                        "end_date",
                        "status",
                        "auto_renew",
                        "updated_at",
                    ]
                )
                record_audit_event(
                    actor=user,
                    action="plan.changed",
                    resource_type="user",
                    resource_id=user.pk,
                    details={
                        "from_plan_id": previous_plan_id,
                        "to_plan_id": new_plan.pk,
                    },
                )

            return Response(
                {
                    "detail":
                        "Plan FREE activado correctamente.",

                    "plan":
                        new_plan.name,

                    "end_date":
                        None,
                },
                status=status.HTTP_200_OK
            )

        # Guardar plan que intenta comprar
  

        user.pending_plan = new_plan

        user.save(
            update_fields=[
                "pending_plan"
            ]
        )

        # MOCK PAYMENT
        result = MockPaymentGateway.process_payment(
            amount=new_plan.monthly_price,
            card_number=card["card_number"]
        )

        # Registrar operación

        with transaction.atomic():

            # Refrescamos usuario
            user.refresh_from_db()

            payment = Payment.objects.create(
                user=user,
                plan=new_plan,
                amount=new_plan.monthly_price,
                payment_type="SUBSCRIPTION",
                status=result.status,
                payment_method="MOCK_CARD",
                transaction_reference=result.reference,
                failure_reason=result.reason
            )
            record_audit_event(
                actor=user,
                action="payment.recorded",
                resource_type="payment",
                resource_id=payment.pk,
                details={
                    "status": payment.status,
                    "payment_type": payment.payment_type,
                    "amount": str(payment.amount),
                    "plan_id": payment.plan_id,
                },
            )

            # PAGO RECHAZADO
            if not result.approved:

                user.pending_plan = None

                user.save(
                    update_fields=[
                        "pending_plan"
                    ]
                )

                return Response(
                    {
                        "detail":
                            result.message,

                        "reason":
                            result.reason,

                        "transaction_reference":
                            result.reference
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            # PAGO APROBADO
            user.plan = new_plan
            user.pending_plan = None

            user.save(
                update_fields=[
                    "plan",
                    "pending_plan",
                ]
            )
            record_audit_event(
                actor=user,
                action="plan.changed",
                resource_type="user",
                resource_id=user.pk,
                details={
                    "from_plan_id": previous_plan_id,
                    "to_plan_id": new_plan.pk,
                },
            )

            now = timezone.now()

            # Creamos o recuperamos información
            # de suscripción
            subscription, _ = (
                Subscription.objects.get_or_create(
                    user=user,
                    defaults={
                        "start_date": now,
                        "end_date":
                            now + timedelta(days=30),
                        "status": "ACTIVE",
                        "auto_renew": False,
                    }
                )
            )

            # Una compra nueva inicia un nuevo
            # período mensual
            subscription.start_date = now
            subscription.end_date = (
                now + timedelta(days=30)
            )
            subscription.status = "ACTIVE"

            subscription.save(
                update_fields=[
                    "start_date",
                    "end_date",
                    "status",
                    "updated_at",
                ]
            )

        return Response(
            {
                "detail":
                    "Plan contratado correctamente.",

                "plan":
                    new_plan.name,

                "amount":
                    str(new_plan.monthly_price),

                "start_date":
                    subscription.start_date,

                "end_date":
                    subscription.end_date,

                "transaction_reference":
                    payment.transaction_reference,
            },
            status=status.HTTP_200_OK
        )

# HISTORIAL DE PAGOS
class PaymentHistoryView(ListAPIView):

    permission_classes = [IsAuthenticated]

    serializer_class = PaymentSerializer

    def get_queryset(self):

        return (
            Payment.objects
            .filter(
                user=self.request.user
            )
            .select_related(
                "plan"
            )
            .order_by(
                "-created_at"
            )
        )


# RENOVAR SUSCRIPCIÓN

class RenewSubscriptionView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = RenewSubscriptionSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        card = serializer.validated_data["card"]

        user = request.user
        plan = user.plan

        # -------------------------------------------------
        # FREE no necesita renovación
        # -------------------------------------------------

        if plan.code == Plan.FREE_CODE:

            return Response(
                {
                    "detail":
                        "El plan FREE no requiere renovación."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener datos de suscripción

        now = timezone.now()

        subscription, _ = (
            Subscription.objects.get_or_create(
                user=user,
                defaults={
                    "start_date": now,
                    "end_date": now,
                    "status": "ACTIVE",
                    "auto_renew": False,
                }
            )
        )

        # MOCK PAYMENT

        result = MockPaymentGateway.process_payment(
            amount=plan.monthly_price,
            card_number=card["card_number"]
        )

        # Procesar renovación
        with transaction.atomic():

            # Bloquear registro de suscripción
            subscription = (
                Subscription.objects
                .select_for_update()
                .get(
                    user=user
                )
            )

            # Registrar pago, incluso si falla
            payment = Payment.objects.create(
                user=user,
                plan=plan,
                amount=plan.monthly_price,
                payment_type="RENEWAL",
                status=result.status,
                payment_method="MOCK_CARD",
                transaction_reference=result.reference,
                failure_reason=result.reason
            )
            record_audit_event(
                actor=user,
                action="payment.recorded",
                resource_type="payment",
                resource_id=payment.pk,
                details={
                    "status": payment.status,
                    "payment_type": payment.payment_type,
                    "amount": str(payment.amount),
                    "plan_id": payment.plan_id,
                },
            )

            # PAGO RECHAZADO
            if not result.approved:

                return Response(
                    {
                        "detail":
                            result.message,

                        "reason":
                            result.reason,

                        "transaction_reference":
                            result.reference
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            now = timezone.now()


            if (
                subscription.end_date
                and subscription.end_date > now
            ):

                base_date = subscription.end_date

            else:

                # Si ya venció, empieza desde hoy
                base_date = now

            subscription.end_date = (
                base_date
                + timedelta(days=30)
            )

            subscription.status = "ACTIVE"

            subscription.save(
                update_fields=[
                    "end_date",
                    "status",
                    "updated_at",
                ]
            )

        return Response(
            {
                "detail":
                    "Plan renovado correctamente.",

                "plan":
                    plan.name,

                "amount":
                    str(plan.monthly_price),

                "new_end_date":
                    subscription.end_date,

                "transaction_reference":
                    payment.transaction_reference
            },
            status=status.HTTP_200_OK
        )

class GlobalPaymentHistoryView(ListAPIView):

    permission_classes = [
        IsAdminOrSupport
    ]

    serializer_class = PaymentManagementSerializer

    def get_queryset(self):

        queryset = (
            Payment.objects
            .select_related(
                "user",
                "plan",
            )
            .all()
            .order_by("-created_at")
        )

        # FILTRO POR ESTADO

        payment_status = (
            self.request.query_params.get(
                "status"
            )
        )

        if payment_status:

            queryset = queryset.filter(
                status=payment_status.upper()
            )

        # FILTRO POR TIPO DE PAGO

        payment_type = (
            self.request.query_params.get(
                "payment_type"
            )
        )

        if payment_type:

            queryset = queryset.filter(
                payment_type=payment_type.upper()
            )

        # FILTRO POR PLAN

        plan = self.request.query_params.get(
            "plan"
        )

        if plan:

            queryset = queryset.filter(
                plan__code=plan.lower()
            )

        # BÚSQUEDA POR USUARIO

        search = self.request.query_params.get(
            "search"
        )

        if search:

            queryset = queryset.filter(
                Q(
                    user__email__icontains=search
                )
                | Q(
                    user__first_name__icontains=search
                )
                | Q(
                    user__last_name__icontains=search
                )
                | Q(
                    transaction_reference__icontains=search
                )
            )

        # FECHA DESDE

        date_from = (
            self.request.query_params.get(
                "date_from"
            )
        )

        if date_from:

            parsed_date = parse_date(
                date_from
            )

            if parsed_date:

                queryset = queryset.filter(
                    created_at__date__gte=parsed_date
                )

        # FECHA HASTA

        date_to = (
            self.request.query_params.get(
                "date_to"
            )
        )

        if date_to:

            parsed_date = parse_date(
                date_to
            )

            if parsed_date:

                queryset = queryset.filter(
                    created_at__date__lte=parsed_date
                )

        return queryset


class UserPaymentHistoryView(APIView):

    permission_classes = [
        IsAdminOrSupport
    ]

    def get(self, request, user_id):

        # BUSCAR USUARIO

        try:

            target_user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return Response(
                {
                    "detail":
                        "El usuario no existe."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # SOPORTE SOLO PUEDE CONSULTAR CLIENTES

        if (
            request.user.role == User.Role.SUPPORT
            and target_user.role != User.Role.CLIENT
        ):

            return Response(
                {
                    "detail":
                        "Soporte únicamente puede "
                        "consultar pagos de clientes."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        queryset = (
            Payment.objects
            .filter(
                user=target_user
            )
            .select_related(
                "user",
                "plan"
            )
            .order_by(
                "-created_at"
            )
        )

        # FILTRO ESTADO

        payment_status = (
            request.query_params.get(
                "status"
            )
        )

        if payment_status:

            queryset = queryset.filter(
                status=payment_status.upper()
            )

        # FILTRO TIPO

        payment_type = (
            request.query_params.get(
                "payment_type"
            )
        )

        if payment_type:

            queryset = queryset.filter(
                payment_type=payment_type.upper()
            )

        # FILTRO PLAN

        plan = request.query_params.get(
            "plan"
        )

        if plan:

            queryset = queryset.filter(
                plan__code=plan.lower()
            )

        serializer = PaymentManagementSerializer(
            queryset,
            many=True
        )

        return Response(
            {
                "user": {
                    "id":
                        target_user.id,

                    "email":
                        target_user.email,

                    "first_name":
                        target_user.first_name,

                    "last_name":
                        target_user.last_name,

                    "current_plan":
                        target_user.plan.name
                        if target_user.plan
                        else None,
                },

                "payments":
                    serializer.data
            },
            status=status.HTTP_200_OK
        )

class PaymentManagementDetailView(APIView):

    permission_classes = [
        IsAdminOrSupport
    ]

    def get(self, request, payment_id):

        try:

            payment = (
                Payment.objects
                .select_related(
                    "user",
                    "plan"
                )
                .get(
                    id=payment_id
                )
            )

        except Payment.DoesNotExist:

            return Response(
                {
                    "detail":
                        "La transacción no existe."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Soporte solamente clientes
        if (
            request.user.role == User.Role.SUPPORT
            and payment.user.role != User.Role.CLIENT
        ):

            return Response(
                {
                    "detail":
                        "No tienes permiso para consultar "
                        "esta transacción."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = (
            PaymentManagementSerializer(
                payment
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )