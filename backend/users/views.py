from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework.views import APIView
from core.audit import record_audit_event
from .models import User
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserAdminUpdateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserSerializer,
    UserStatusSerializer,
)
from .permissions import IsAdminOrSupport, IsAdministrator

# Para Registrarse
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        with transaction.atomic():
            user = serializer.save()
            record_audit_event(
                actor=user,
                action="auth.register",
                resource_type="user",
                resource_id=user.pk,
            )

class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record_audit_event(
            actor=serializer.user,
            action="auth.login",
            resource_type="user",
            resource_id=serializer.user.pk,
        )
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)

        return Response(serializer.data)


class UserManagementListView(ListAPIView):

    serializer_class = UserListSerializer

    permission_classes = [
        IsAuthenticated,
        IsAdminOrSupport,
    ]

    def get_queryset(self):

        current_user = self.request.user

        queryset = (
            User.objects
            .select_related(
                "plan",
                "subscription",
            )
            .all()
            .order_by("-created_at")
        )

        # PERMISOS SEGÚN ROL

        # Soporte solo puede consultar clientes
        if current_user.role == User.Role.SUPPORT:

            queryset = queryset.filter(
                role=User.Role.CLIENT
            )

        # Admin puede consultar todos
        elif current_user.role == User.Role.ADMIN:

            queryset = queryset.all()

        # BUSCADOR

        search = self.request.query_params.get(
            "search"
        )

        if search:

            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        # FILTRO POR ROl

        role = self.request.query_params.get(
            "role"
        )

        if (
            role
            and current_user.role == User.Role.ADMIN
        ):

            queryset = queryset.filter(
                role=role
            )

        # FILTRO POR ESTADO

        is_active = (
            self.request.query_params.get(
                "is_active"
            )
        )

        if is_active is not None:

            if is_active.lower() == "true":

                queryset = queryset.filter(
                    is_active=True
                )

            elif is_active.lower() == "false":

                queryset = queryset.filter(
                    is_active=False
                )

        # FILTRO POR PLAN

        plan = self.request.query_params.get(
            "plan"
        )

        if plan:

            queryset = queryset.filter(
                plan__code=plan
            )

        return queryset


class UserManagementDetailView(APIView):

    permission_classes = [
        IsAdminOrSupport
    ]

    def get(self, request, user_id):

        try:

            user = (
                User.objects
                .select_related(
                    "plan",
                    "subscription",
                )
                .get(id=user_id)
            )

        except User.DoesNotExist:

            return Response(
                {
                    "detail":
                        "El usuario no existe."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # RESTRICCIÓN PARA SOPORTE

        if (
            request.user.role == User.Role.SUPPORT
            and user.role != User.Role.CLIENT
        ):

            return Response(
                {
                    "detail":
                        "No tienes permiso para consultar "
                        "este usuario."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = UserDetailSerializer(
            user
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

class UserManagementUpdateView(APIView):

    permission_classes = [
        IsAdministrator
    ]

    def patch(self, request, user_id):

        try:
            user = User.objects.get(
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

        serializer = UserAdminUpdateSerializer(
            user,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            {
                "detail":
                    "Usuario actualizado correctamente.",

                "user":
                    serializer.data,
            },
            status=status.HTTP_200_OK
        )

class UserStatusView(APIView):

    permission_classes = [
        IsAdminOrSupport
    ]

    def patch(self, request, user_id):

        # Buscar usuario

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

        current_user = request.user

        # ADMIN no puede desactivarse
        # a sí mismo

        if current_user.id == target_user.id:

            return Response(
                {
                    "detail":
                        "No puedes modificar el estado "
                        "de tu propia cuenta."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # SOPORTE solamente CLIENTES

        if (
            current_user.role == User.Role.SUPPORT
            and target_user.role != User.Role.CLIENT
        ):

            return Response(
                {
                    "detail":
                        "Soporte únicamente puede modificar "
                        "el estado de cuentas de clientes."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Validar información

        serializer = UserStatusSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        new_status = (
            serializer.validated_data[
                "is_active"
            ]
        )

        # Ya tiene ese estado

        if target_user.is_active == new_status:

            state = (
                "activo"
                if new_status
                else "desactivado"
            )

            return Response(
                {
                    "detail":
                        f"El usuario ya se encuentra {state}."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cambiar estado

        target_user.is_active = new_status

        target_user.save(
            update_fields=[
                "is_active"
            ]
        )

        state = (
            "activado"
            if new_status
            else "desactivado"
        )

        return Response(
            {
                "detail":
                    f"Usuario {state} correctamente.",

                "user": {
                    "id":
                        target_user.id,

                    "email":
                        target_user.email,

                    "role":
                        target_user.role,

                    "is_active":
                        target_user.is_active,
                }
            },
            status=status.HTTP_200_OK
        )