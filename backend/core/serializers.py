from rest_framework import serializers

from core.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_id = serializers.ReadOnlyField()
    actor_email = serializers.EmailField(source="actor.email", allow_null=True, default=None)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor_id",
            "actor_email",
            "action",
            "resource_type",
            "resource_id",
            "details",
            "created_at",
        )
        read_only_fields = fields
