#!/bin/sh
set -e
mkdir -p /app/data /app/media /app/staticfiles

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Демо-данные для проверки UI (идемпотентно). Отключить: RUN_DEMO_SEED=0
if [ "${RUN_DEMO_SEED:-1}" != "0" ] && [ "${RUN_DEMO_SEED:-1}" != "false" ]; then
  python manage.py seed_demo
fi

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
