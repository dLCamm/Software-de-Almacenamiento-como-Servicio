from django.shortcuts import render

from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import UserSerializer
from .models import User
from .serializers import RegisterSerializer, LoginSerializer

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