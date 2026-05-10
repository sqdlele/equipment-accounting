"""
Скрипт для заполнения БД тестовыми данными.
Запуск: python manage.py shell < seed_data.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.locations.models import Department, Location
from apps.employees.models import Employee
from apps.assets.models import Category, Manufacturer, Asset
from apps.maintenance.models import RepairTicket

User = get_user_model()

# Пользователи
admin_user, _ = User.objects.get_or_create(username='admin', defaults={
    'email': 'admin@irz.ru', 'role': 'admin', 'is_staff': True, 'is_superuser': True,
    'first_name': 'Администратор', 'last_name': 'Системы',
})
admin_user.set_password('admin123')
admin_user.save()

engineer, _ = User.objects.get_or_create(username='engineer', defaults={
    'email': 'engineer@irz.ru', 'role': 'engineer',
    'first_name': 'Иван', 'last_name': 'Петров',
})
engineer.set_password('engineer123')
engineer.save()

# Подразделения
dept_it, _ = Department.objects.get_or_create(name='ИТ-отдел')
dept_buh, _ = Department.objects.get_or_create(name='Бухгалтерия')
dept_prod, _ = Department.objects.get_or_create(name='Производство')

# Локации
loc_warehouse, _ = Location.objects.get_or_create(name='Склад ИТ', defaults={'type': 'warehouse', 'department': dept_it})
loc_office1, _ = Location.objects.update_or_create(
    name='Кабинет 201',
    defaults={'type': 'office', 'department': dept_buh, 'room_code': '201'},
)
loc_office2, _ = Location.objects.update_or_create(
    name='Кабинет 105',
    defaults={'type': 'office', 'department': dept_it, 'room_code': '105'},
)
loc_server, _ = Location.objects.get_or_create(name='Серверная', defaults={'type': 'server_room', 'department': dept_it})

# Сотрудники
emp1, _ = Employee.objects.get_or_create(full_name='Иванов Алексей Сергеевич', defaults={
    'position': 'Системный администратор', 'department': dept_it, 'email': 'ivanov@irz.ru',
})
emp2, _ = Employee.objects.get_or_create(full_name='Смирнова Ольга Николаевна', defaults={
    'position': 'Главный бухгалтер', 'department': dept_buh, 'email': 'smirnova@irz.ru',
})
emp3, _ = Employee.objects.get_or_create(full_name='Козлов Дмитрий Андреевич', defaults={
    'position': 'Инженер ИТ', 'department': dept_it, 'email': 'kozlov@irz.ru',
})

# Категории и производители
cat_pc, _ = Category.objects.get_or_create(name='Персональный компьютер')
cat_laptop, _ = Category.objects.get_or_create(name='Ноутбук')
cat_monitor, _ = Category.objects.get_or_create(name='Монитор')
cat_printer, _ = Category.objects.get_or_create(name='Принтер')
cat_server, _ = Category.objects.get_or_create(name='Сервер')

man_dell, _ = Manufacturer.objects.get_or_create(name='Dell')
man_hp, _ = Manufacturer.objects.get_or_create(name='HP')
man_lenovo, _ = Manufacturer.objects.get_or_create(name='Lenovo')
man_samsung, _ = Manufacturer.objects.get_or_create(name='Samsung')

from datetime import date

# Активы
assets_data = [
    {'inventory_number': 'IRZ-PC-001', 'name': 'ПК Рабочая станция', 'model': 'OptiPlex 7090',
     'category': cat_pc, 'manufacturer': man_dell, 'status': 'in_use',
     'location': loc_office2, 'responsible_employee': emp1,
     'purchase_date': date(2022, 3, 15),
     'serial_number': 'DELL2022001', 'price': 85000},
    {'inventory_number': 'IRZ-LT-001', 'name': 'Ноутбук корпоративный', 'model': 'ThinkPad E15',
     'category': cat_laptop, 'manufacturer': man_lenovo, 'status': 'in_use',
     'location': loc_office1, 'responsible_employee': emp2,
     'purchase_date': date(2023, 1, 20),
     'serial_number': 'LEN2023002', 'price': 95000},
    {'inventory_number': 'IRZ-MON-001', 'name': 'Монитор 24"', 'model': 'UltraSharp U2422H',
     'category': cat_monitor, 'manufacturer': man_dell, 'status': 'in_use',
     'location': loc_office2, 'responsible_employee': emp3,
     'purchase_date': date(2022, 6, 10),
     'serial_number': 'DMON22003', 'price': 35000},
    {'inventory_number': 'IRZ-PC-002', 'name': 'ПК в ремонте', 'model': 'ProDesk 600 G6',
     'category': cat_pc, 'manufacturer': man_hp, 'status': 'repair',
     'location': loc_warehouse,
     'purchase_date': date(2021, 11, 5),
     'serial_number': 'HP2021004', 'price': 72000},
    {'inventory_number': 'IRZ-SRV-001', 'name': 'Сервер приложений', 'model': 'PowerEdge R640',
     'category': cat_server, 'manufacturer': man_dell, 'status': 'in_use',
     'location': loc_server, 'responsible_employee': emp1,
     'purchase_date': date(2021, 8, 20),
     'serial_number': 'DELSRV001', 'price': 450000},
    {'inventory_number': 'IRZ-PRN-001', 'name': 'Лазерный принтер', 'model': 'LaserJet Pro M404dn',
     'category': cat_printer, 'manufacturer': man_hp, 'status': 'warehouse',
     'location': loc_warehouse,
     'purchase_date': date(2023, 5, 12),
     'serial_number': 'HPPRN23001', 'price': 28000},
]

created_assets = []
for data in assets_data:
    asset, created = Asset.objects.get_or_create(
        inventory_number=data['inventory_number'],
        defaults=data
    )
    created_assets.append(asset)

# Заявки 
if created_assets[3]:
    ticket, created = RepairTicket.objects.get_or_create(
        asset=created_assets[3],
        defaults={
            'reported_by': engineer,
            'assigned_to': emp1,
            'status': 'in_progress',
            'priority': 'high',
            'description': 'Не загружается операционная система. При включении выдаёт синий экран смерти (BSOD).',
            'defect_type': 'Программный сбой ОС',
        }
    )

print('Тестовые данные успешно загружены!')
print(f'  Пользователи: admin/admin123, engineer/engineer123')
print(f'  Активы: {Asset.objects.count()} шт.')
print(f'  Заявки: {RepairTicket.objects.count()} шт.')
