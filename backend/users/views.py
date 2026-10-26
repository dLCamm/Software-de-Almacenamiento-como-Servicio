from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import record_audit_event
from .models import User
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

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