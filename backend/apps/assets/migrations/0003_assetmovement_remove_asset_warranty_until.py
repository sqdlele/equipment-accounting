# Generated manually - после 0002_alter_asset_manufacture_year

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('employees', '0001_initial'),
        ('locations', '0001_initial'),
        ('assets', '0002_alter_asset_manufacture_year'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='asset',
            name='warranty_until',
        ),
        migrations.CreateModel(
            name='AssetMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_number', models.CharField(blank=True, max_length=100, verbose_name='Номер документа')),
                ('note', models.TextField(blank=True, verbose_name='Комментарий')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Дата записи')),
                ('asset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movements', to='assets.asset', verbose_name='Актив')),
                ('from_location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movements_from', to='locations.location', verbose_name='Локация (было)')),
                ('from_responsible_employee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movements_from_employee', to='employees.employee', verbose_name='Ответственный (было)')),
                ('to_location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movements_to', to='locations.location', verbose_name='Локация (стало)')),
                ('to_responsible_employee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movements_to_employee', to='employees.employee', verbose_name='Ответственный (стало)')),
                ('performed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='asset_movements', to=settings.AUTH_USER_MODEL, verbose_name='Оформил')),
            ],
            options={
                'verbose_name': 'Перемещение актива',
                'verbose_name_plural': 'Журнал перемещений',
                'ordering': ['-created_at'],
            },
        ),
    ]
