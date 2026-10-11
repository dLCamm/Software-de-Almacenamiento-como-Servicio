from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Plan, User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from plans.models import Subscription
from django.utils import timezone


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ("code", "name", "storage_limit_bytes", "monthly_price")


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8
    )

    plan = PlanSerializer(
        read_only=True
    )

    pending_plan = PlanSerializer(
        read_only=True
    )

    class Meta:
        model = User

        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "role",
            "password",
            "password_confirm",
            "plan",
            "pending_plan",
        )

        read_only_fields = (
            "id",
            "role",
            "plan",
            "pending_plan",
        )

    def validate(self, data):

        if (
            data["password"]
            != data["password_confirm"]
        ):
            raise serializers.ValidationError({
                "password_confirm":
                    "Las contraseñas no coinciden."
            })

        return data

    def create(self, validated_data):

        validated_data.pop(
            "password_confirm",
            None
        )

        user = User.objects.create_user(
            **validated_data
        )

        return user

    def validate_email(self, value):
        email = value.lower().strip()

        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "Ya existe una cuenta con este correo electrónico."
            )

        return email

    def validate_plan_code(self, value):
        if not Plan.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError("El plan solicitado no está disponible.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm":
                    "Las contraseñas no coinciden."
            })

        user = User(
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages}) from error

        user = User(
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages}) from error

        return attrs

    def create(self, validated_data):

        # Este campo solo sirve para validar.
        # NO pertenece al modelo User.
        validated_data.pop("password_confirm", None)

        password = validated_data.pop("password")
        selected_plan_code = validated_data.pop("plan_code")
        free_plan = Plan.objects.get(code=Plan.FREE_CODE)
        selected_plan = Plan.objects.get(code=selected_plan_code, is_active=True)

        user = User.objects.create_user(
            password=password,

            # Todo registro público será CLIENTE.
            role=User.Role.CLIENT,
            plan=free_plan,
            pending_plan=selected_plan if selected_plan != free_plan else None,
            **validated_data
        )
        


        Subscription.objects.get_or_create(
            user=user,
            defaults={
                "start_date": timezone.now(),
                "end_date": None,
                "status": "ACTIVE",
                "auto_renew": False,
            }
        )

        return user



class UserSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    pending_plan = PlanSerializer(read_only=True)

    class Meta:
        model = User

        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "role",
            "plan",
            "pending_plan",
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
            "plan": PlanSerializer(self.user.plan).data,
            "pending_plan": (
                PlanSerializer(self.user.pending_plan).data
                if self.user.pending_plan
                else None
            ),
        }

        return data