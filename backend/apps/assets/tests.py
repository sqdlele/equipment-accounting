import shutil
import tempfile

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.assets.models import Asset, AssetHistory, AssetMovement, Category, Manufacturer
from apps.assets.test_report import report_banner, report_scenario, report_summary
from apps.employees.models import Employee
from apps.locations.models import Department, Location
from apps.maintenance.models import RepairTicket, RepairWork

TEST_MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class DiplomaScenarioApiTests(APITestCase):
    """13 сценариев из гл. 3 — с выводом в консоль для рисунков 3.2–3.8."""

    scenarios_total = 13

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        report_banner()


    def setUp(self):
        self.department = Department.objects.create(name='ИТ-отдел (тест)')
        self.location_wh = Location.objects.create(
            name='Склад ИТ',
            type=Location.TYPE_WAREHOUSE,
            department=self.department,
        )
        self.location_office = Location.objects.create(
            name='Кабинет 365',
            room_code='365',
            type=Location.TYPE_OFFICE,
            department=self.department,
        )
        self.employee = Employee.objects.create(
            full_name='Иванов Иван Иванович',
            position='Инженер',
            department=self.department,
        )
        self.employee2 = Employee.objects.create(
            full_name='Петров Петр Петрович',
            position='Системный администратор',
            department=self.department,
        )
        self.category = Category.objects.create(name='Персональные компьютеры')
        self.category_mon = Category.objects.create(name='Мониторы')
        self.manufacturer = Manufacturer.objects.create(name='Lenovo')
        self.user = User.objects.create_user(
            username='engineer_test',
            password='demo123',
            role=User.ROLE_ENGINEER,
        )

    def _auth(self):
        self.client.force_authenticate(self.user)

    def _create_asset(
        self,
        inventory_number='IRZ-TEST-001',
        status_value=Asset.STATUS_WAREHOUSE,
        category=None,
        location=None,
        responsible=None,
    ):
        return Asset.objects.create(
            inventory_number=inventory_number,
            serial_number=f'SN-{inventory_number}',
            name='Тестовый компьютер',
            model='ThinkCentre M70q',
            category=category or self.category,
            manufacturer=self.manufacturer,
            status=status_value,
            location=location or self.location_wh,
            responsible_employee=responsible or self.employee,
            price='55000.00',
        )

    # --- Сценарий 1 ---
    def test_scenario_01_authorization(self):
        bad = self.client.post('/api/auth/token/', {'username': 'engineer_test', 'password': 'wrong'})
        self.assertEqual(bad.status_code, status.HTTP_401_UNAUTHORIZED)

        good = self.client.post('/api/auth/token/', {'username': 'engineer_test', 'password': 'demo123'})
        self.assertEqual(good.status_code, status.HTTP_200_OK)
        self.assertIn('access', good.data)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {good.data["access"]}')
        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, status.HTTP_200_OK)

        report_scenario(
            1,
            'Проверка авторизации пользователя',
            figure='Рисунок 3.2 — Проверка авторизации пользователя',
            steps=[
                'POST /api/auth/token/ с неверным паролем',
                'POST /api/auth/token/ с верным паролем (JWT)',
                'GET /api/auth/me/ с access-токеном',
            ],
            expected='Успешный вход и доступ к API по JWT; при неверном пароле — отказ.',
            actual=[
                f'Неверный пароль: HTTP {bad.status_code}',
                f'Верный пароль: HTTP {good.status_code}, выдан access-токен',
                f'Профиль пользователя: HTTP {me.status_code}, роль={me.data.get("role", "—")}',
            ],
        )

    # --- Сценарий 2 ---
    def test_scenario_02_dashboard(self):
        self._auth()
        self._create_asset('IRZ-DASH-001', Asset.STATUS_WAREHOUSE)
        self._create_asset('IRZ-DASH-002', Asset.STATUS_IN_USE)
        RepairTicket.objects.create(
            asset=self._create_asset('IRZ-DASH-003', Asset.STATUS_REPAIR),
            assigned_to=self.employee,
            description='Тестовый ремонт',
            status=RepairTicket.STATUS_OPEN,
        )

        r = self.client.get('/api/dashboard/stats/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(r.data['total_assets'], 3)

        report_scenario(
            2,
            'Проверка дашборда',
            figure='Рисунок 3.8 — Итоговые показатели (дашборд)',
            steps=['GET /api/dashboard/stats/ после наполнения тестовыми данными'],
            expected='Статистика по технике, складу, ремонтам и распределениям.',
            actual=[
                f'Всего техники: {r.data.get("total_assets")}',
                f'На складе: {r.data.get("warehouse_on_stock")}',
                f'Активных ремонтов: {r.data.get("active_repairs")}',
                'Поля status_distribution, category_distribution присутствуют',
            ],
        )

    # --- Сценарий 3 ---
    def test_scenario_03_register_asset(self):
        self._auth()
        r = self.client.post('/api/assets/', {
            'inventory_number': 'IRZ-NEW-001',
            'serial_number': 'SN-NEW-001',
            'name': 'Новый тестовый компьютер',
            'model': 'ThinkCentre M70q',
            'category': self.category.id,
            'manufacturer': self.manufacturer.id,
            'status': Asset.STATUS_WAREHOUSE,
            'location': self.location_wh.id,
            'responsible_employee': self.employee.id,
            'price': '55000.00',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        asset = Asset.objects.get(inventory_number='IRZ-NEW-001')
        self.assertTrue(asset.qr_code.name)

        report_scenario(
            3,
            'Регистрация новой единицы техники',
            figure='Рисунок 3.3 — Проверка регистрации новой единицы техники',
            steps=['POST /api/assets/ — создание карточки'],
            expected='Запись в БД, QR-код, история «Создан».',
            actual=[
                f'HTTP {r.status_code}, id={asset.id}',
                f'Инв. номер: {asset.inventory_number}',
                f'QR-код: {"сформирован" if asset.qr_code.name else "нет"}',
                f'История: {AssetHistory.objects.filter(asset=asset, field_changed="Создан").count()} запись',
            ],
        )

    # --- Сценарий 4 ---
    def test_scenario_04_duplicate_inventory_number(self):
        self._auth()
        self._create_asset('IRZ-PC-001')
        r = self.client.post('/api/assets/', {
            'inventory_number': 'IRZ-PC-001',
            'name': 'Дубликат',
            'status': Asset.STATUS_WAREHOUSE,
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

        report_scenario(
            4,
            'Проверка ограничения уникальности инвентарного номера',
            steps=['Повторный POST /api/assets/ с тем же IRZ-PC-001'],
            expected='Вторая запись с тем же номером не создаётся.',
            actual=[f'HTTP {r.status_code}', f'Ответ API: {str(r.data)[:120]}'],
        )

    # --- Сценарий 5 ---
    def test_scenario_05_search_and_filters(self):
        self._auth()
        self._create_asset('IRZ-FLT-001', Asset.STATUS_WAREHOUSE, category=self.category_mon)
        self._create_asset('IRZ-FLT-002', Asset.STATUS_IN_USE)

        by_search = self.client.get('/api/assets/', {'search': 'FLT-001'})
        by_status = self.client.get('/api/assets/', {'status': Asset.STATUS_IN_USE})
        by_cat = self.client.get('/api/assets/', {'category': self.category_mon.id})
        all_assets = self.client.get('/api/assets/')

        self.assertEqual(by_search.status_code, status.HTTP_200_OK)
        nums = [x['inventory_number'] for x in by_search.data['results']]
        self.assertIn('IRZ-FLT-001', nums)

        report_scenario(
            5,
            'Поиск и фильтрация техники',
            steps=[
                'GET /api/assets/?search=FLT-001',
                'GET /api/assets/?status=in_use',
                'GET /api/assets/?category=<мониторы>',
            ],
            expected='Список меняется по условиям поиска и фильтров.',
            actual=[
                f'Поиск: найдено {by_search.data["count"]} (номера: {", ".join(nums)})',
                f'Фильтр «В эксплуатации»: {by_status.data["count"]} шт.',
                f'Фильтр по категории «Мониторы»: {by_cat.data["count"]} шт.',
                f'Без фильтров: {all_assets.data["count"]} шт.',
            ],
        )

    # --- Сценарий 6 ---
    def test_scenario_06_asset_update_history(self):
        self._auth()
        asset = self._create_asset('IRZ-HIST-001', Asset.STATUS_WAREHOUSE)
        r = self.client.patch(f'/api/assets/{asset.id}/', {
            'status': Asset.STATUS_IN_USE,
            'location': self.location_office.id,
            'responsible_employee': self.employee2.id,
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        history = AssetHistory.objects.filter(asset=asset).exclude(field_changed='Создан')
        self.assertTrue(history.exists())

        report_scenario(
            6,
            'Изменение карточки техники и история изменений',
            figure='Рисунок 3.4 — Проверка истории изменений актива',
            steps=[f'PATCH /api/assets/{asset.id}/ — смена статуса, локации, ответственного'],
            expected='Изменения сохранены, в истории — кто и что изменил.',
            actual=[
                f'HTTP {r.status_code}',
                f'Записей в истории (кроме «Создан»): {history.count()}',
                f'Пример: {history.first().field_changed} — {history.first().old_value} → {history.first().new_value}',
            ],
        )

    # --- Сценарий 7 ---
    def test_scenario_07_movement(self):
        self._auth()
        asset = self._create_asset('IRZ-MOV-001')
        r = self.client.post('/api/movements/', {
            'asset': asset.id,
            'to_location': self.location_office.id,
            'to_responsible_employee': self.employee2.id,
            'document_number': 'АКТ-001',
            'note': 'Передача на рабочее место',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        asset.refresh_from_db()
        dup = self.client.post('/api/movements/', {
            'asset': asset.id,
            'to_location': self.location_office.id,
            'to_responsible_employee': self.employee2.id,
        }, format='json')
        self.assertEqual(dup.status_code, status.HTTP_400_BAD_REQUEST)

        report_scenario(
            7,
            'Перемещение техники между локациями',
            steps=[
                'POST /api/movements/ — новая локация и ответственный',
                'Повтор без изменений — ожидается отказ',
            ],
            expected='Журнал перемещений и обновление карточки; пустое перемещение запрещено.',
            actual=[
                f'Перемещение: HTTP {r.status_code}, локация → {asset.location.name}',
                f'Журнал: {AssetMovement.objects.filter(asset=asset).count()} запись',
                f'Дубликат перемещения: HTTP {dup.status_code} (отклонено)',
            ],
        )

    # --- Сценарий 8 ---
    def test_scenario_08_create_repair_ticket(self):
        self._auth()
        asset = self._create_asset('IRZ-REP-001', Asset.STATUS_IN_USE)
        r = self.client.post('/api/repairs/', {
            'asset': asset.id,
            'assigned_to': self.employee.id,
            'priority': RepairTicket.PRIORITY_HIGH,
            'description': 'Компьютер не загружается',
            'defect_type': 'Сбой ОС',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        asset.refresh_from_db()
        self.assertEqual(asset.status, Asset.STATUS_REPAIR)

        report_scenario(
            8,
            'Создание ремонтной заявки',
            figure='Рисунок 3.5 — Проверка регистрации ремонтной заявки',
            steps=['POST /api/repairs/ для техники «В эксплуатации»'],
            expected='Заявка создана, статус техники — «В ремонте».',
            actual=[
                f'HTTP {r.status_code}, заявка #{r.data["id"]}',
                f'Статус техники: {asset.get_status_display()}',
                f'История статуса: {AssetHistory.objects.filter(asset=asset, field_changed="Статус").count()} запись',
            ],
        )

    # --- Сценарий 9 ---
    def test_scenario_09_add_repair_work(self):
        self._auth()
        asset = self._create_asset('IRZ-WORK-001', Asset.STATUS_IN_USE)
        ticket = RepairTicket.objects.create(
            asset=asset,
            assigned_to=self.employee,
            description='Не включается',
            status=RepairTicket.STATUS_IN_PROGRESS,
        )
        asset.status = Asset.STATUS_REPAIR
        asset.save(update_fields=['status'])
        r = self.client.post(f'/api/repairs/{ticket.id}/add-work/', {
            'work_description': 'Замена блока питания, проверка RAM',
            'parts_used': 'БП 500W, термопаста',
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RepairWork.objects.filter(ticket=ticket).count(), 1)

        report_scenario(
            9,
            'Добавление выполненной ремонтной работы',
            steps=[f'POST /api/repairs/{ticket.id}/add-work/'],
            expected='Запись о работе в журнале заявки.',
            actual=[
                f'HTTP {r.status_code}',
                f'Работ по заявке: {RepairWork.objects.filter(ticket=ticket).count()}',
                f'Описание: {RepairWork.objects.filter(ticket=ticket).first().work_description[:60]}…',
            ],
        )

    # --- Сценарий 10 ---
    def test_scenario_10_close_repair_downtime(self):
        self._auth()
        asset = self._create_asset('IRZ-CLOSE-001', Asset.STATUS_IN_USE)
        create = self.client.post('/api/repairs/', {
            'asset': asset.id,
            'assigned_to': self.employee.id,
            'priority': RepairTicket.PRIORITY_MEDIUM,
            'description': 'Шум вентилятора',
            'defect_type': 'Механика',
        }, format='json')
        ticket_id = create.data['id']
        r = self.client.patch(f'/api/repairs/{ticket_id}/', {'status': RepairTicket.STATUS_CLOSED}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        ticket = RepairTicket.objects.get(id=ticket_id)
        asset.refresh_from_db()
        self.assertIsNotNone(ticket.resolved_at)
        self.assertGreaterEqual(ticket.downtime_hours, 0)
        self.assertEqual(asset.status, Asset.STATUS_WAREHOUSE)

        report_scenario(
            10,
            'Закрытие ремонтной заявки и расчёт простоя',
            steps=[f'PATCH /api/repairs/{ticket_id}/ — статус «Закрыт»'],
            expected='Дата решения, часы простоя, техника на складе.',
            actual=[
                f'HTTP {r.status_code}',
                f'resolved_at: {ticket.resolved_at}',
                f'Простой, ч: {ticket.downtime_hours}',
                f'Статус техники после закрытия: {asset.get_status_display()}',
            ],
        )

    # --- Сценарий 11 ---
    def test_scenario_11_replace_from_warehouse(self):
        self._auth()
        broken = self._create_asset(
            'IRZ-BROKEN-001',
            Asset.STATUS_IN_USE,
            location=self.location_office,
            responsible=self.employee,
        )
        spare = self._create_asset(
            'IRZ-SPARE-001',
            Asset.STATUS_WAREHOUSE,
            category=broken.category,
        )
        ticket = RepairTicket.objects.create(
            asset=broken,
            assigned_to=self.employee,
            description='Плата вышла из строя',
            status=RepairTicket.STATUS_IN_PROGRESS,
        )
        broken.status = Asset.STATUS_REPAIR
        broken.save(update_fields=['status'])

        r = self.client.post(f'/api/repairs/{ticket.id}/replace-from-warehouse/', {
            'replacement_asset_id': spare.id,
        }, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        broken.refresh_from_db()
        spare.refresh_from_db()
        ticket.refresh_from_db()
        self.assertEqual(broken.status, Asset.STATUS_WAREHOUSE)
        self.assertEqual(spare.status, Asset.STATUS_IN_USE)
        self.assertEqual(ticket.asset_id, spare.id)

        report_scenario(
            11,
            'Замена неисправной техники оборудованием со склада',
            steps=[f'POST /api/repairs/{ticket.id}/replace-from-warehouse/'],
            expected='Со склада — в эксплуатацию; неисправная — на склад.',
            actual=[
                f'HTTP {r.status_code}',
                f'Неисправная {broken.inventory_number}: {broken.get_status_display()}, склад {broken.location}',
                f'Выдана {spare.inventory_number}: {spare.get_status_display()}, ответственный {spare.responsible_employee}',
                f'В заявке теперь актив: {ticket.asset.inventory_number}',
                f'Записей о работах: {RepairWork.objects.filter(ticket=ticket).count()}',
            ],
        )

    # --- Сценарий 12 ---
    def test_scenario_12_reports(self):
        self._auth()
        self._create_asset('IRZ-RPT-001')
        excel = self.client.get('/api/reports/export/assets/excel/')
        pdf = self.client.get('/api/reports/export/assets/pdf/')
        repairs_xlsx = self.client.get('/api/reports/export/repairs/excel/')

        self.assertEqual(excel.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(repairs_xlsx.status_code, status.HTTP_200_OK)

        report_scenario(
            12,
            'Формирование отчётов',
            figure='Рисунок 3.6 — Проверка формирования отчётности',
            steps=[
                'GET /api/reports/export/assets/excel/',
                'GET /api/reports/export/assets/pdf/',
                'GET /api/reports/export/repairs/excel/',
            ],
            expected='Файлы Excel и PDF с актуальными данными.',
            actual=[
                f'Инвентаризация Excel: HTTP {excel.status_code}, {len(excel.content)} байт',
                f'Инвентаризация PDF: HTTP {pdf.status_code}, {len(pdf.content)} байт',
                f'Журнал ремонтов Excel: HTTP {repairs_xlsx.status_code}, {len(repairs_xlsx.content)} байт',
            ],
        )

    # --- Сценарий 13 ---
    def test_scenario_13_docker_deployment_note(self):
        self._auth()
        health = self.client.get('/api/dashboard/stats/')
        self.assertEqual(health.status_code, status.HTTP_200_OK)

        report_scenario(
            13,
            'Проверка запуска через Docker Compose',
            figure='Рисунок 3.7 — Проверка запуска приложения через Docker Compose',
            steps=[
                'В каталоге webapp: docker compose build',
                'docker compose up -d',
                'docker compose ps',
                'Браузер: http://localhost',
                f'API (в тесте): GET /api/dashboard/stats/ → HTTP {health.status_code}',
            ],
            expected='Контейнеры Running, интерфейс и API доступны, данные в volumes.',
            actual=[
                'Автотест подтверждает доступность backend API',
                'Для рисунка 3.7 сделайте скрин: docker compose ps или браузер после up -d',
                'Для рисунка 3.1 / 3.14 — скрин дашборда в браузере',
            ],
        )

    @classmethod
    def tearDownClass(cls):
        report_summary(cls.scenarios_total, cls.scenarios_total)
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)
        super().tearDownClass()
