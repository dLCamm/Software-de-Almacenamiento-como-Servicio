from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser, BaseUserManager, AbstractBaseUser, PermissionsMixin
from django.db import models


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
        plan = extra_fields.pop("plan", None) or Plan.objects.get(code=Plan.FREE_CODE)

        user = self.model(
            email=email,
            plan=plan,
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

    def __str__(self):
        return self.email
