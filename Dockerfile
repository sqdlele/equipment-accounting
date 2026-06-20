FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    gcc \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend/ /app/
COPY frontend/ /usr/share/nginx/html/
COPY docker/amvera-nginx.conf /tmp/amvera-nginx.conf
COPY docker/amvera-entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh && \
    rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf /etc/nginx/http.d/default.conf && \
    mkdir -p /etc/nginx/conf.d && cp /tmp/amvera-nginx.conf /etc/nginx/conf.d/default.conf && \
    mkdir -p /app/data /app/media /app/staticfiles /run/nginx && \
    if [ -d /usr/share/fonts/truetype/dejavu ]; then \
        cp /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf /app/apps/reports/fonts/ 2>/dev/null || true; \
        cp /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf /app/apps/reports/fonts/ 2>/dev/null || true; \
    fi

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
