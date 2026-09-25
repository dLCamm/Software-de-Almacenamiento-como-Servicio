from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser, BaseUserManager, AbstractBaseUser, PermissionsMixin
from django.db import models


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
