from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_ENGINEER = 'engineer'
    ROLE_WAREHOUSE = 'warehouse'
    ROLE_READONLY = 'readonly'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Администратор'),
        (ROLE_ENGINEER, 'ИТ-инженер'),
        (ROLE_WAREHOUSE, 'Кладовщик'),
        (ROLE_READONLY, 'Читатель'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_READONLY, verbose_name='Роль')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.get_role_display()})'

    @property
    def is_admin(self):
        return self.role == self.ROLE_ADMIN or self.is_superuser

    @property
    def is_engineer(self):
        return self.role in (self.ROLE_ADMIN, self.ROLE_ENGINEER) or self.is_superuser

    @property
    def can_write(self):
        return self.role in (self.ROLE_ADMIN, self.ROLE_ENGINEER, self.ROLE_WAREHOUSE) or self.is_superuser
