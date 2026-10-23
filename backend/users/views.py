from django.shortcuts import render

from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import UserSerializer
from .models import User
from .serializers import RegisterSerializer, LoginSerializer
from django.db.models import Q
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from .models import User
from .serializers import UserListSerializer
from .permissions import IsAdminOrSupport


# Para Registrarse
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    

class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

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