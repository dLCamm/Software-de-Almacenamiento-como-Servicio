from rest_framework import serializers
from .models import PlanBenefit, Subscription
from rest_framework import serializers
from users.models import Plan

class PlanBenefitSerializer(serializers.ModelSerializer):

    class Meta:
        model = PlanBenefit

        fields = [
            "id",
            "description",
            "order",
        ]


class PlanSerializer(serializers.ModelSerializer):

    benefits = PlanBenefitSerializer(
        many=True,
        read_only=True
    )

    storage_limit_gb = serializers.SerializerMethodField()

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
        ]

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
        write_only=True
    )

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
        ]

        read_only_fields = [
            "storage_limit_bytes"
        ]

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