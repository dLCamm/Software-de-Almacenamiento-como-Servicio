from rest_framework.permissions import BasePermission


class IsClient(BasePermission):
    message = "Los planes, la facturación y el almacenamiento personal son exclusivos de clientes."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "CLIENT")


class IsAdministrator(BasePermission):

    def has_permission(self, request, view):

        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "ADMIN"
        )

class IsAdminOrSupport(BasePermission):

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in [
                "ADMIN",
                "SUPPORT",
            ]
        )
