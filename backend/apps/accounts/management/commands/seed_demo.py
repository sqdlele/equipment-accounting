"""
Заполнение БД демо-данными для проверки учёта техники.

  python manage.py migrate
  python manage.py seed_demo --reset

Учётные записи (пароль задаётся только при первом создании пользователя):
  admin / admin123
  engineer, warehouse, viewer / demo123
"""
from decimal import Decimal
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.locations.models import Department, Location
from apps.employees.models import Employee
from apps.assets.models import Asset, Category, Manufacturer, AssetHistory
from apps.maintenance.models import RepairTicket, RepairWork

User = get_user_model()

DEMO_PASSWORD = 'demo123'
ADMIN_PASSWORD = 'admin123'


def _ensure_user(username, *, password, role, is_staff=False, is_superuser=False, **defaults):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'role': role,
            'is_staff': is_staff or is_superuser,
            'is_superuser': is_superuser,
            **defaults,
        },
    )
    if created:
        user.set_password(password)
        user.save()
    return user, created


class Command(BaseCommand):
    help = 'Заполняет БД демо-данными (локации, активы, сотрудники, заявки на ремонт).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Удалить учётные данные (активы, историю, ремонты, локации, справочники) перед заполнением.',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING('Удаление демо-сущностей...'))
            RepairWork.objects.all().delete()
            RepairTicket.objects.all().delete()
            AssetHistory.objects.all().delete()
            Asset.objects.all().delete()
            Employee.objects.all().delete()
            Location.objects.all().delete()
            Department.objects.all().delete()
            Category.objects.all().delete()
            Manufacturer.objects.all().delete()

        created_users = []
        for spec in (
            ('admin', ADMIN_PASSWORD, User.ROLE_ADMIN, dict(
                is_superuser=True, is_staff=True,
                first_name='Админ', last_name='Системный', email='admin@local.test',
            )),
            ('engineer', DEMO_PASSWORD, User.ROLE_ENGINEER, dict(
                is_staff=True,
                first_name='Иван', last_name='Петров', email='engineer@local.test',
            )),
            ('warehouse', DEMO_PASSWORD, User.ROLE_WAREHOUSE, dict(
                is_staff=True,
                first_name='Мария', last_name='Сидорова', email='warehouse@local.test',
            )),
            ('viewer', DEMO_PASSWORD, User.ROLE_READONLY, dict(
                first_name='Гость', last_name='ТолькоЧтение', email='viewer@local.test',
            )),
        ):
            username, password, role, extra = spec
            _, c = _ensure_user(username, password=password, role=role, **extra)
            if c:
                created_users.append(username)

        dep_it, _ = Department.objects.get_or_create(
            name='Отдел ИТ',
            defaults={'description': 'Информационные технологии и техподдержка'},
        )
        dep_acc, _ = Department.objects.get_or_create(
            name='Бухгалтерия',
            defaults={'description': 'Финансовый учёт'},
        )
        dep_prod, _ = Department.objects.get_or_create(
            name='Производство',
            defaults={'description': 'Цех и склад готовой продукции'},
        )

        loc_wh, _ = Location.objects.get_or_create(
            name='Центральный склад ИТ',
            defaults={
                'type': Location.TYPE_WAREHOUSE,
                'department': dep_it,
                'room_code': '',
                'description': 'Хранение резерва и новой техники',
            },
        )
        loc_srv, _ = Location.objects.get_or_create(
            name='Серверная 101',
            defaults={
                'type': Location.TYPE_SERVER,
                'department': dep_it,
                'room_code': '101',
                'description': 'Стойки, UPS, климат',
            },
        )
        loc_off365, _ = Location.objects.get_or_create(
            name='Кабинет 365',
            defaults={
                'type': Location.TYPE_OFFICE,
                'department': dep_acc,
                'room_code': '365',
                'description': 'Рабочие места бухгалтерии',
            },
        )
        loc_ws, _ = Location.objects.get_or_create(
            name='Цех сборки А',
            defaults={
                'type': Location.TYPE_WORKSHOP,
                'department': dep_prod,
                'room_code': 'А-12',
                'description': 'Линия сборки',
            },
        )

        emp_eng, _ = Employee.objects.get_or_create(
            email='i.petrov@company.local',
            defaults={
                'full_name': 'Петров Иван Сергеевич',
                'position': 'ИТ-инженер',
                'department': dep_it,
                'phone': '+7 900 111-22-33',
                'is_active': True,
            },
        )
        emp_wh, _ = Employee.objects.get_or_create(
            email='m.sidorova@company.local',
            defaults={
                'full_name': 'Сидорова Мария Олеговна',
                'position': 'Кладовщик',
                'department': dep_it,
                'phone': '+7 900 444-55-66',
                'is_active': True,
            },
        )
        emp_acc, _ = Employee.objects.get_or_create(
            email='e.kozlov@company.local',
            defaults={
                'full_name': 'Козлов Евгений Андреевич',
                'position': 'Главный бухгалтер',
                'department': dep_acc,
                'phone': '+7 900 777-88-99',
                'is_active': True,
            },
        )

        cat_pc, _ = Category.objects.get_or_create(
            name='ПК и моноблоки',
            defaults={'description': 'Настольные компьютеры'},
        )
        cat_mon, _ = Category.objects.get_or_create(
            name='Мониторы',
            defaults={'description': 'Дисплеи'},
        )
        cat_nb, _ = Category.objects.get_or_create(
            name='Ноутбуки',
            defaults={'description': 'Мобильные рабочие станции'},
        )
        cat_net, _ = Category.objects.get_or_create(
            name='Сетевое оборудование',
            defaults={'description': 'Коммутаторы, точки доступа'},
        )
        cat_prn, _ = Category.objects.get_or_create(
            name='Периферия',
            defaults={'description': 'Принтеры, МФУ'},
        )

        m_dell, _ = Manufacturer.objects.get_or_create(name='Dell')
        m_hp, _ = Manufacturer.objects.get_or_create(name='HP')
        m_lenovo, _ = Manufacturer.objects.get_or_create(name='Lenovo')
        m_cisco, _ = Manufacturer.objects.get_or_create(name='Cisco')
        m_asus, _ = Manufacturer.objects.get_or_create(name='ASUS')
        m_zebra, _ = Manufacturer.objects.get_or_create(name='Zebra')

        today = date.today()

        assets_spec = [
            dict(
                inventory_number='INV-PC-2024-001',
                serial_number='SN-DELL-77491',
                name='Рабочая станция инженера',
                category=cat_pc,
                manufacturer=m_dell,
                model='OptiPlex 7090',
                status=Asset.STATUS_IN_USE,
                location=loc_srv,
                manufacture_year=2023,
                responsible_employee=emp_eng,
                purchase_date=today - timedelta(days=400),
                price=Decimal('95000.00'),
                description='32 GB RAM, SSD 1 TB, Windows 11 Pro',
            ),
            dict(
                inventory_number='INV-NB-2023-014',
                serial_number='LNV-MJ129',
                name='Ноутбук для выездных работ',
                category=cat_nb,
                manufacturer=m_lenovo,
                model='ThinkPad T14 Gen 3',
                status=Asset.STATUS_IN_USE,
                location=loc_wh,
                manufacture_year=2023,
                responsible_employee=emp_eng,
                purchase_date=today - timedelta(days=500),
                price=Decimal('118000.50'),
                description='14", i7, 16 GB',
            ),
            dict(
                inventory_number='365202201',
                serial_number='MON-HP-WIDE-02',
                name='Монитор 27"',
                category=cat_mon,
                manufacturer=m_hp,
                model='E27 G5',
                status=Asset.STATUS_IN_USE,
                location=loc_off365,
                manufacture_year=2022,
                responsible_employee=emp_acc,
                purchase_date=today - timedelta(days=700),
                price=Decimal('22000.00'),
                description='Номер по схеме: кабинет + год + место',
            ),
            dict(
                inventory_number='INV-MON-2024-005',
                serial_number='AS-VP279Q',
                name='Монитор ASUS 27"',
                category=cat_mon,
                manufacturer=m_asus,
                model='VP279Q',
                status=Asset.STATUS_WAREHOUSE,
                location=loc_wh,
                manufacture_year=2024,
                responsible_employee=None,
                purchase_date=today - timedelta(days=60),
                price=Decimal('18990.00'),
                description='Резерв на складе',
            ),
            dict(
                inventory_number='INV-SW-2022-003',
                serial_number='CS-C2960-883',
                name='Коммутатор доступа',
                category=cat_net,
                manufacturer=m_cisco,
                model='Catalyst 2960-L',
                status=Asset.STATUS_IN_USE,
                location=loc_srv,
                manufacture_year=2021,
                responsible_employee=emp_eng,
                purchase_date=today - timedelta(days=900),
                price=Decimal('45000.00'),
                description='24 порта PoE',
            ),
            dict(
                inventory_number='INV-PRN-2021-009',
                serial_number='HP-LJ-M402',
                name='Принтер лазерный',
                category=cat_prn,
                manufacturer=m_hp,
                model='LaserJet Pro M404dn',
                status=Asset.STATUS_REPAIR,
                location=loc_off365,
                manufacture_year=2021,
                responsible_employee=emp_acc,
                purchase_date=today - timedelta(days=1000),
                price=Decimal('28000.00'),
                description='Зажёв бумаги - в ремонте',
            ),
            dict(
                inventory_number='INV-PC-2019-099',
                serial_number='OLD-DELL-0099',
                name='Старый ПК бухгалтерии',
                category=cat_pc,
                manufacturer=m_dell,
                model='OptiPlex 3060',
                status=Asset.STATUS_WRITTEN_OFF,
                location=loc_wh,
                manufacture_year=2019,
                responsible_employee=None,
                purchase_date=today - timedelta(days=2000),
                price=Decimal('42000.00'),
                description='Списан по акту 2025',
            ),
            dict(
                inventory_number='INV-NB-2025-001',
                serial_number='LNV-NEW-001',
                name='Ноутбук (новый, не выдан)',
                category=cat_nb,
                manufacturer=m_lenovo,
                model='ThinkPad E16',
                status=Asset.STATUS_WAREHOUSE,
                location=loc_wh,
                manufacture_year=2025,
                responsible_employee=None,
                purchase_date=today - timedelta(days=14),
                price=Decimal('79999.00'),
                description='Ожидает выдачи',
            ),
            dict(
                inventory_number='WH-TOOL-TABLET-01',
                serial_number='ZEBRA-TC21',
                name='ТСД для склада',
                category=cat_nb,
                manufacturer=m_zebra,
                model='TC21',
                status=Asset.STATUS_IN_USE,
                location=loc_ws,
                manufacture_year=2024,
                responsible_employee=emp_wh,
                purchase_date=today - timedelta(days=200),
                price=Decimal('55000.00'),
                description='Сканирование марок в цехе',
            ),
        ]

        for spec in assets_spec:
            inv = spec['inventory_number']
            Asset.objects.get_or_create(
                inventory_number=inv,
                defaults=spec,
            )

        # История по первому активу (если только что создан)
        pc_asset = Asset.objects.filter(inventory_number='INV-PC-2024-001').first()
        if pc_asset and not AssetHistory.objects.filter(asset=pc_asset).exists():
            admin_u = User.objects.filter(username='admin').first()
            AssetHistory.objects.create(
                asset=pc_asset,
                changed_by=admin_u,
                field_changed='status',
                old_value='На складе',
                new_value='В эксплуатации',
                note='Ввод в эксплуатацию в серверной',
            )

        # Заявки на ремонт
        printer = Asset.objects.filter(inventory_number='INV-PRN-2021-009').first()
        nb_asset = Asset.objects.filter(inventory_number='INV-NB-2023-014').first()

        if printer:
            t_open, c_open = RepairTicket.objects.get_or_create(
                asset=printer,
                description='Постоянные замятия из лотка 2',
                defaults={
                    'reported_by': User.objects.filter(username='warehouse').first(),
                    'assigned_to': emp_eng,
                    'status': RepairTicket.STATUS_IN_PROGRESS,
                    'priority': RepairTicket.PRIORITY_HIGH,
                    'defect_type': 'Механика подачи',
                },
            )
            if c_open:
                RepairWork.objects.create(
                    ticket=t_open,
                    performed_by=emp_eng,
                    work_description='Чистка роликов, тест 50 листов - замятия повторяются',
                    parts_used='Комплект роликов RF-123 (заказан)',
                )

        if nb_asset:
            t_closed, c_closed = RepairTicket.objects.get_or_create(
                asset=nb_asset,
                description='Не держит заряд аккумулятора',
                defaults={
                    'reported_by': User.objects.filter(username='engineer').first(),
                    'assigned_to': emp_eng,
                    'status': RepairTicket.STATUS_CLOSED,
                    'priority': RepairTicket.PRIORITY_MEDIUM,
                    'defect_type': 'АКБ',
                    'resolved_at': timezone.now() - timedelta(days=5),
                },
            )
            if c_closed:
                RepairWork.objects.create(
                    ticket=t_closed,
                    performed_by=emp_eng,
                    work_description='Замена батареи на оригинальную',
                    parts_used='Battery Lenovo 01AV489',
                    performed_at=timezone.now() - timedelta(days=5),
                )

        mon_wh = Asset.objects.filter(inventory_number='INV-MON-2024-005').first()
        if mon_wh:
            RepairTicket.objects.get_or_create(
                asset=mon_wh,
                description='Проверка после поступления на склад - битых пикселей нет',
                defaults={
                    'reported_by': User.objects.filter(username='warehouse').first(),
                    'assigned_to': emp_wh,
                    'status': RepairTicket.STATUS_RESOLVED,
                    'priority': RepairTicket.PRIORITY_LOW,
                    'defect_type': 'Приёмка',
                    'resolved_at': timezone.now() - timedelta(days=2),
                },
            )

        self.stdout.write(self.style.SUCCESS('Готово.'))
        self.stdout.write(f'  Локаций: {Location.objects.count()}')
        self.stdout.write(f'  Активов: {Asset.objects.count()}')
        self.stdout.write(f'  Заявок на ремонт: {RepairTicket.objects.count()}')
        if created_users:
            self.stdout.write(self.style.NOTICE(
                f'  Созданы пользователи: {", ".join(created_users)}'
            ))
        self.stdout.write('')
        self.stdout.write('Вход в систему (пароль задаётся при первом создании пользователя):')
        self.stdout.write(f'  admin / {ADMIN_PASSWORD}')
        self.stdout.write(f'  engineer, warehouse, viewer / {DEMO_PASSWORD}')
        self.stdout.write('')
        self.stdout.write('Повторный запуск без --reset добавляет только отсутствующие записи по ключам.')
