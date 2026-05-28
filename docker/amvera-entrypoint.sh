#!/bin/sh
set -e

mkdir -p /app/data /app/media /app/staticfiles /run/nginx

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py repair_asset_media

# For production deployment on Amvera keep seed off by default.
if [ "${RUN_DEMO_SEED:-0}" != "0" ] && [ "${RUN_DEMO_SEED:-0}" != "false" ]; then
  python manage.py seed_demo
fi

gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120 &

exec nginx -g 'daemon off;'
