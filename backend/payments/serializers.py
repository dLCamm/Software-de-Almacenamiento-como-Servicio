from rest_framework import serializers

from .models import Payment


class MockCardSerializer(serializers.Serializer):

    card_number = serializers.CharField(
        min_length=16,
        max_length=19,
        write_only=True
    )

    expiry = serializers.CharField(
        max_length=5,
        write_only=True
    )

    cvv = serializers.CharField(
        min_length=3,
        max_length=4,
        write_only=True
    )

    def validate_card_number(self, value):

        number = value.replace(" ", "")

        if not number.isdigit():
            raise serializers.ValidationError(
                "El número de tarjeta debe contener solo números."
            )

        if len(number) != 16:
            raise serializers.ValidationError(
                "La tarjeta debe contener 16 dígitos."
            )

        return number


class ChangePlanSerializer(serializers.Serializer):

    plan_id = serializers.IntegerField()

    card = MockCardSerializer()


class RenewSubscriptionSerializer(serializers.Serializer):

    card = MockCardSerializer()


class PaymentSerializer(serializers.ModelSerializer):

    plan_name = serializers.CharField(
        source="plan.name",
        read_only=True
    )

    class Meta:
        model = Payment

        fields = [
            "id",
            "plan",
            "plan_name",
            "amount",
            "payment_type",
            "status",
            "payment_method",
            "transaction_reference",
            "failure_reason",
            "created_at",
        ]