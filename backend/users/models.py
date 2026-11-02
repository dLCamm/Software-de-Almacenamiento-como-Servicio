from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models, transaction
from django.utils import timezone


class Plan(models.Model):

    FREE_CODE = "free"
    code = models.SlugField(
        max_length=50,
        unique=True )

    name = models.CharField(
        max_length=50)

    storage_limit_bytes = models.BigIntegerField()

    monthly_price = models.DecimalField(
        max_digits=8,
        decimal_places=2)

    is_active = models.BooleanField(
        default=True)

    class Meta:
        ordering = ["monthly_price"]

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    """
    Manager personalizado porque utilizaremos email
    en lugar de username para iniciar sesión.
    """

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El correo electrónico es obligatorio.")

        email = self.normalize_email(email)
        user = self.model(
            email=email,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "El superusuario debe tener is_staff=True."
            )

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "El superusuario debe tener is_superuser=True."
            )

        return self.create_user(
            email=email,
            password=password,
            **extra_fields
        )


class User(AbstractUser):

    class Role(models.TextChoices):
        CLIENT = "CLIENT", "Cliente"
        SUPPORT = "SUPPORT", "Soporte Técnico"
        ADMIN = "ADMIN", "Administrador"

    # Eliminamos username porque utilizaremos email
    username = None

    email = models.EmailField(
        unique=True,
        verbose_name="Correo electrónico"
    )

    plan = models.ForeignKey(
        Plan,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="users",
        verbose_name="Plan actual",
    )
    pending_plan = models.ForeignKey(
        Plan,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="users_with_pending_plan",
        verbose_name="Plan pendiente de pago",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT,
        verbose_name="Rol"
    )

    is_email_verified = models.BooleanField(
        default=False,
        verbose_name="Correo verificado"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última actualización"
    )

    USERNAME_FIELD = "email"

    # No necesitamos campos adicionales al crear superusuario.
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta(AbstractUser.Meta):
        abstract = False
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(role="CLIENT", plan__isnull=False)
                    | models.Q(role__in=["ADMIN", "SUPPORT"], plan__isnull=True, pending_plan__isnull=True)
                ),
                name="user_plan_matches_role",
            ),
        ]

    def _normalize_plan_for_role(self):
        if self.role == self.Role.CLIENT:
            if self.plan_id is None:
                self.plan = Plan.objects.get(code=Plan.FREE_CODE)
        else:
            self.plan = None
            self.pending_plan = None

    def clean(self):
        super().clean()
        self._normalize_plan_for_role()

    def save(self, *args, **kwargs):
        from plans.models import Subscription

        update_fields = kwargs.get("update_fields")
        if update_fields is not None and not update_fields:
            return
        with transaction.atomic(using=kwargs.get("using")):
            previous_role = None
            if not self._state.adding and (update_fields is None or "role" in update_fields):
                previous_role = type(self).objects.filter(pk=self.pk).values_list("role", flat=True).first()
            original_plan_ids = (self.plan_id, self.pending_plan_id)
            becoming_client = previous_role in (self.Role.ADMIN, self.Role.SUPPORT) and self.role == self.Role.CLIENT
            if becoming_client:
                self.plan = None
                self.pending_plan = None
            self._normalize_plan_for_role()
            if update_fields is not None and original_plan_ids != (self.plan_id, self.pending_plan_id):
                kwargs["update_fields"] = set(update_fields) | {"plan", "pending_plan"}
            super().save(*args, **kwargs)

            # Conservar los registros anteriores, sin suscripción operativa ni renovación.
            if self.role != self.Role.CLIENT:
                Subscription.objects.filter(user_id=self.pk).exclude(status="CANCELLED", auto_renew=False).update(
                    status="CANCELLED", auto_renew=False, updated_at=timezone.now(),
                )
            elif becoming_client:
                Subscription.objects.update_or_create(user_id=self.pk, defaults={
                    "start_date": timezone.now(), "end_date": None,
                    "status": "ACTIVE", "auto_renew": False,
                })
            if self.role != self.Role.CLIENT or becoming_client:
                self._state.fields_cache.pop("subscription", None)

    def __str__(self):
        return self.email
