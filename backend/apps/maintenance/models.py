from django.db import models
from django.utils import timezone
from apps.assets.models import Asset
from apps.employees.models import Employee


class RepairTicket(models.Model):
    STATUS_OPEN = 'open'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_WAITING_PARTS = 'waiting_parts'
    STATUS_RESOLVED = 'resolved'
    STATUS_CLOSED = 'closed'

    STATUS_CHOICES = [
        (STATUS_OPEN, 'Открыт'),
        (STATUS_IN_PROGRESS, 'В работе'),
        (STATUS_WAITING_PARTS, 'Ожидание запчастей'),
        (STATUS_RESOLVED, 'Решён'),
        (STATUS_CLOSED, 'Закрыт'),
    ]

    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_CRITICAL = 'critical'

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Низкий'),
        (PRIORITY_MEDIUM, 'Средний'),
        (PRIORITY_HIGH, 'Высокий'),
        (PRIORITY_CRITICAL, 'Критический'),
    ]

    asset = models.ForeignKey(
        Asset, on_delete=models.CASCADE,
        related_name='repair_tickets', verbose_name='Актив'
    )
    reported_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reported_tickets', verbose_name='Зарегистрировал'
    )
    assigned_to = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_tickets', verbose_name='Исполнитель'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN, verbose_name='Статус')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM, verbose_name='Приоритет')
    description = models.TextField(verbose_name='Описание дефекта')
    defect_type = models.CharField(max_length=100, blank=True, verbose_name='Тип дефекта')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлён')
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='Решён')

    class Meta:
        verbose_name = 'Заявка на ремонт'
        verbose_name_plural = 'Заявки на ремонт'
        ordering = ['-created_at']

    def __str__(self):
        return f'#{self.pk} {self.asset.inventory_number} - {self.get_status_display()}'

    @property
    def downtime_hours(self):
        if self.created_at:
            end = self.resolved_at or timezone.now()
            delta = end - self.created_at
            return round(delta.total_seconds() / 3600, 1)
        return 0

    def save(self, *args, **kwargs):
        if self.status in (self.STATUS_RESOLVED, self.STATUS_CLOSED) and not self.resolved_at:
            self.resolved_at = timezone.now()
        super().save(*args, **kwargs)


class RepairWork(models.Model):
    ticket = models.ForeignKey(
        RepairTicket, on_delete=models.CASCADE,
        related_name='works', verbose_name='Заявка'
    )
    performed_by = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='repair_works', verbose_name='Исполнитель'
    )
    work_description = models.TextField(verbose_name='Описание работ')
    parts_used = models.TextField(blank=True, verbose_name='Использованные запчасти')
    performed_at = models.DateTimeField(default=timezone.now, verbose_name='Дата выполнения')

    class Meta:
        verbose_name = 'Запись о работе'
        verbose_name_plural = 'Журнал работ'
        ordering = ['-performed_at']

    def __str__(self):
        return f'Работа по заявке #{self.ticket_id} - {self.performed_at:%d.%m.%Y}'
