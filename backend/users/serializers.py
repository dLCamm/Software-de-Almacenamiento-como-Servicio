from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:
        model = User

        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "password",
            "password_confirm",
        )

        read_only_fields = (
            "id",
        )

    def validate_email(self, value):
        email = value.lower().strip()

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "Ya existe una cuenta con este correo electrónico."
            )

        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Las contraseñas no coinciden."
            })

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")

        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,

            # Todo registro público será CLIENTE.
            role=User.Role.CLIENT,

            **validated_data
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User

        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "role",
            "is_email_verified",
            "is_active",
            "created_at",
        )

        read_only_fields = fields

class LoginSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["email"] = user.email
        token["role"] = user.role

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        data["user"] = {
            "id": self.user.id,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "email": self.user.email,
            "role": self.user.role,
        }

        return data