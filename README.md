# Техника — учёт техники (веб-приложение)

Django + React (Vite), развёртывание через Docker(nginx + gunicorn).

## Требования

- Docker и Docker Compose 
**или**
- Python 3.11+ и Node.js 18+ 

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
cd backend
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
npm install
npm run dev
```

Фронтенд проксирует `/api` на `http://localhost:8000` (см. `vite.config.ts`).



