from core.models import AuditLog


def record_audit_event(
    actor,
    action: str,
    resource_type: str,
    resource_id=None,
    details: dict | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else "",
        details=details or {},
    )
