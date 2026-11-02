from decimal import Decimal

from django.db import transaction
from rest_framework import serializers
from .models import PlanBenefit, Subscription
from .entitlements import get_plan_features
from users.models import Plan

class PlanBenefitSerializer(serializers.ModelSerializer):

    class Meta:
        model = PlanBenefit

        fields = [
            "id",
            "description",
            "feature",
            "order",
        ]

    def validate(self, attrs):
        if attrs.get("feature"):
            attrs["description"] = PlanBenefit.Feature(attrs["feature"]).label
        return attrs


class PlanSerializer(serializers.ModelSerializer):

    benefits = PlanBenefitSerializer(
        many=True,
        read_only=True
    )

    storage_limit_gb = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()

    class Meta:
        model = Plan

        fields = [
            "id",
            "code",
            "name",
            "storage_limit_bytes",
            "storage_limit_gb",
            "monthly_price",
            "is_active",
            "benefits",
            "features",
        ]

    def get_features(self, obj):
        return get_plan_features(obj)

    def get_storage_limit_gb(self, obj):

        return round(
            obj.storage_limit_bytes
            / (1024 ** 3),
            2
        )

class SubscriptionSerializer(serializers.ModelSerializer):

    plan = serializers.SerializerMethodField()

    class Meta:
        model = Subscription

        fields = [
            "id",
            "plan",
            "start_date",
            "end_date",
            "status",
            "auto_renew",
        ]

    def get_plan(self, obj):

        plan = obj.user.plan

        return PlanSerializer(plan).data

class PlanAdminSerializer(serializers.ModelSerializer):

    benefits = PlanBenefitSerializer(
        many=True,
        required=False
    )

    storage_limit_gb = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        min_value=Decimal("0.01"),
        write_only=True
    )
    features = serializers.SerializerMethodField()

    class Meta:
        model = Plan

        fields = [
            "id",
            "code",
            "name",
            "storage_limit_bytes",
            "storage_limit_gb",
            "monthly_price",
            "is_active",
            "benefits",
            "features",
        ]

        read_only_fields = [
            "storage_limit_bytes"
        ]

        extra_kwargs = {"monthly_price": {"min_value": Decimal("0.00")}}

    def get_features(self, obj):
        return get_plan_features(obj)

    def validate(self, attrs):
        code = attrs.get("code", getattr(self.instance, "code", ""))
        price = attrs.get("monthly_price", getattr(self.instance, "monthly_price", 0))
        if self.instance and self.instance.code == Plan.FREE_CODE and code != Plan.FREE_CODE:
            raise serializers.ValidationError({"code": "El código del plan FREE no puede cambiarse."})
        if code == Plan.FREE_CODE:
            if price != 0:
                raise serializers.ValidationError({"monthly_price": "El plan FREE debe ser gratuito."})
            if attrs.get("is_active") is False:
                raise serializers.ValidationError({"is_active": "El plan FREE debe permanecer activo."})

        benefits = attrs.get("benefits")
        if benefits is None:
            features = [benefit.feature for benefit in self.instance.benefits.all() if benefit.feature] if self.instance else []
        else:
            features = [benefit["feature"] for benefit in benefits if benefit.get("feature")]
        if len(features) != len(set(features)):
            raise serializers.ValidationError({"benefits": "No repitas una función dentro del mismo plan."})
        if features and (code == Plan.FREE_CODE or price <= 0):
            raise serializers.ValidationError({"benefits": "Los archivos temporales y los enlaces compartidos requieren un plan con precio mayor a 0."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):

        benefits_data = validated_data.pop(
            "benefits",
            []
        )

        storage_gb = validated_data.pop(
            "storage_limit_gb"
        )

        validated_data[
            "storage_limit_bytes"
        ] = int(
            storage_gb * (1024 ** 3)
        )

        plan = Plan.objects.create(
            **validated_data
        )

        for benefit_data in benefits_data:

            PlanBenefit.objects.create(
                plan=plan,
                **benefit_data
            )

        return plan

    @transaction.atomic
    def update(self, instance, validated_data):

        benefits_data = validated_data.pop(
            "benefits",
            None
        )

        storage_gb = validated_data.pop(
            "storage_limit_gb",
            None
        )

        if storage_gb is not None:

            validated_data[
                "storage_limit_bytes"
            ] = int(
                storage_gb * (1024 ** 3)
            )

        for attr, value in validated_data.items():

            setattr(
                instance,
                attr,
                value
            )

        instance.save()

        if benefits_data is not None:

            instance.benefits.all().delete()

            for benefit_data in benefits_data:

                PlanBenefit.objects.create(
                    plan=instance,
                    **benefit_data
                )

        return instance
