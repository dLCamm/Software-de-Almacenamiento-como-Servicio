from rest_framework import serializers

from .models import Plan, PlanBenefit, Subscription


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

    class Meta:
        model = Plan

        fields = [
            "id",
            "name",
            "slug",
            "description",
            "price",
            "storage_gb",
            "is_active",
            "is_popular",
            "benefits",
        ]

class SubscriptionSerializer(serializers.ModelSerializer):

    plan = PlanSerializer(read_only=True)

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