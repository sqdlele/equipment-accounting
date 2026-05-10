import io
import qrcode
from django.db import models
from django.core.files.base import ContentFile
from apps.locations.models import Location
from apps.employees.models import Employee


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['name']

    def __str__(self):
        return self.name


class Manufacturer(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='Производитель')

    class Meta:
        verbose_name = 'Производитель'
        verbose_name_plural = 'Производители'
        ordering = ['name']

    def __str__(self):
        return self.name


class Asset(models.Model):
    STATUS_WAREHOUSE = 'warehouse'
    STATUS_IN_USE = 'in_use'
    STATUS_REPAIR = 'repair'
    STATUS_WRITTEN_OFF = 'written_off'

    STATUS_CHOICES = [
        (STATUS_WAREHOUSE, 'На складе'),
        (STATUS_IN_USE, 'В эксплуатации'),
        (STATUS_REPAIR, 'В ремонте'),
        (STATUS_WRITTEN_OFF, 'Списан'),
    ]

    inventory_number = models.CharField(max_length=50, unique=True, verbose_name='Инвентарный номер')
    serial_number = models.CharField(max_length=100, blank=True, verbose_name='Серийный номер')
    name = models.CharField(max_length=255, verbose_name='Наименование')
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assets', verbose_name='Категория'
    )
    manufacturer = models.ForeignKey(
        Manufacturer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assets', verbose_name='Производитель'
    )
    model = models.CharField(max_length=255, blank=True, verbose_name='Модель')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_WAREHOUSE, verbose_name='Статус')
    location = models.ForeignKey(
        Location, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assets', verbose_name='Локация'
    )
    manufacture_year = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name='Год изготовления',
        help_text='Указание года из маркировки или документов (опционально)',
    )
    responsible_employee = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assets', verbose_name='Ответственный сотрудник'
    )
    purchase_date = models.DateField(null=True, blank=True, verbose_name='Дата приобретения')
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Стоимость')
    description = models.TextField(blank=True, verbose_name='Описание/Конфигурация')
    photo = models.ImageField(upload_to='assets/photos/', null=True, blank=True, verbose_name='Фото')
    qr_code = models.ImageField(upload_to='assets/qr/', null=True, blank=True, verbose_name='QR-код')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлён')

    class Meta:
        verbose_name = 'Актив'
        verbose_name_plural = 'Активы'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.inventory_number} — {self.name}'

    def generate_qr_code(self):
        qr_data = f'IT-ASSET:{self.inventory_number}:{self.name}'
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        filename = f'qr_{self.inventory_number}.png'
        self.qr_code.save(filename, ContentFile(buffer.getvalue()), save=False)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new and not self.qr_code:
            super().save(*args, **kwargs)
            self.generate_qr_code()
            Asset.objects.filter(pk=self.pk).update(qr_code=self.qr_code)
        else:
            super().save(*args, **kwargs)


class AssetHistory(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='history', verbose_name='Актив')
    changed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='asset_changes', verbose_name='Изменил'
    )
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата изменения')
    field_changed = models.CharField(max_length=100, verbose_name='Поле')
    old_value = models.TextField(blank=True, verbose_name='Было')
    new_value = models.TextField(blank=True, verbose_name='Стало')
    note = models.TextField(blank=True, verbose_name='Примечание')

    class Meta:
        verbose_name = 'История актива'
        verbose_name_plural = 'История активов'
        ordering = ['-changed_at']

    def __str__(self):
        return f'{self.asset.inventory_number}: {self.field_changed} ({self.changed_at:%d.%m.%Y})'


class AssetMovement(models.Model):
    """Журнал перемещений между локациями и закрепления за ответственными."""

    asset = models.ForeignKey(
        Asset, on_delete=models.CASCADE,
        related_name='movements', verbose_name='Актив'
    )
    from_location = models.ForeignKey(
        Location, on_delete=models.SET_NULL,
        related_name='movements_from', null=True, blank=True,
        verbose_name='Локация (было)',
    )
    to_location = models.ForeignKey(
        Location, on_delete=models.SET_NULL,
        related_name='movements_to', null=True, blank=True,
        verbose_name='Локация (стало)',
    )
    from_responsible_employee = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        related_name='movements_from_employee', null=True, blank=True,
        verbose_name='Ответственный (было)',
    )
    to_responsible_employee = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        related_name='movements_to_employee', null=True, blank=True,
        verbose_name='Ответственный (стало)',
    )
    document_number = models.CharField(max_length=100, blank=True, verbose_name='Номер документа')
    note = models.TextField(blank=True, verbose_name='Комментарий')
    performed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='asset_movements', verbose_name='Оформил',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата записи')

    class Meta:
        verbose_name = 'Перемещение актива'
        verbose_name_plural = 'Журнал перемещений'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.asset.inventory_number} @ {self.created_at:%d.%m.%Y %H:%M}'
