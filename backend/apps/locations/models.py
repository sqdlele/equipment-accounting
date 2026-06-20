from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=200, unique=True, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')

    class Meta:
        verbose_name = 'Подразделение'
        verbose_name_plural = 'Подразделения'
        ordering = ['name']

    def __str__(self):
        return self.name


class Location(models.Model):
    TYPE_WAREHOUSE = 'warehouse'
    TYPE_OFFICE = 'office'
    TYPE_WORKSHOP = 'workshop'
    TYPE_SERVER = 'server_room'

    TYPE_CHOICES = [
        (TYPE_WAREHOUSE, 'Склад'),
        (TYPE_OFFICE, 'Офис/Кабинет'),
        (TYPE_WORKSHOP, 'Цех'),
        (TYPE_SERVER, 'Серверная'),
    ]

    name = models.CharField(max_length=200, verbose_name='Название')
    room_code = models.CharField(
        max_length=32, blank=True, default='',
        verbose_name='Код кабинета для номеров техники',
        help_text='Напр. 365 для номера монитора 365202201 (кабинет + год + номер места)',
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_OFFICE, verbose_name='Тип')
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='locations', verbose_name='Подразделение'
    )
    description = models.TextField(blank=True, verbose_name='Описание')

    class Meta:
        verbose_name = 'Локация'
        verbose_name_plural = 'Локации'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.get_type_display()})'
