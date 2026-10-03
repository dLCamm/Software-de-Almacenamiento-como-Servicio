from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from plans.models import Plan, Subscription


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True
    )

    password_confirm = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User

        fields = [
            "id",   
            "first_name",
            "last_name",
            "email",
            "password",
            "password_confirm",
        ]

    def validate(self, data):

        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm":
                    "Las contraseñas no coinciden."
            })

        return data

    def create(self, validated_data):

        # Este campo solo sirve para validar.
        # NO pertenece al modelo User.
        validated_data.pop("password_confirm", None)

        with transaction.atomic():

            try:
                free_plan = Plan.objects.get(
                    slug="free",
                    is_active=True
                )

            except Plan.DoesNotExist:
                raise serializers.ValidationError({
                    "plan":
                        "El plan gratuito no está configurado."
                })

            user = User.objects.create_user(
                **validated_data
            )

            Subscription.objects.create(
                user=user,
                plan=free_plan,
                status="ACTIVE",
                auto_renew=False
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