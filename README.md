<<<<<<< Updated upstream
# Техника — учёт техники (веб-приложение)
=======
# ИТ-Техника - учёт техники (веб-приложение)
>>>>>>> Stashed changes

Django REST API + статический frontend на обычном JavaScript, развёртывание через Docker (nginx + gunicorn).

## Требования

- Docker и Docker Compose
**или**
- Python 3.11+ для backend и любой простой static-server для frontend

## Автотесты (13 сценариев из гл. 3)

Из каталога `webapp/backend` (или через Docker):

```bash
python manage.py test apps.assets
```

В консоли выводится отчёт по каждому из 13 сценариев (удобно для скриншотов в диплом).

## Быстрый старт (Docker)
Из каталога `webapp`:

```bash
cp .env.example .env
# Отредактируйте .env: SECRET_KEY, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS

docker compose build
docker compose up -d
```

По умолчанию приложение доступно на порту 80 (см. `PORT` в `.env`). При первом старте backend выполняет миграции; при `RUN_DEMO_SEED=1` (по умолчанию) загружаются демо-данные и тестовые пользователи (см. `backend/apps/accounts/management/commands/seed_demo.py`).

## Локальная разработка (без Docker)

### Backend

```bash

python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd frontend
# вариант 1: Python static-server
python -m http.server 5173
```

При локальном запуске без nginx API должен быть доступен по тому же origin или через отдельный локальный reverse-proxy. Основной рекомендуемый способ запуска - Docker Compose, где nginx раздаёт статические файлы и проксирует `/api` на backend.

<<<<<<< Updated upstream

=======
## Структура frontend
>>>>>>> Stashed changes

- `frontend/index.html` - входная HTML-страница SPA.
- `frontend/css/app.css` - стили без frontend-сборщика.
- `frontend/js/` - vanilla JS-модули: router, auth, API client, layout и страницы.
- `frontend/vendor/chart.umd.min.js` - локальная копия Chart.js для графиков.