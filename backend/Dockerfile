FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*


COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p data media staticfiles && \
    if [ -d /usr/share/fonts/truetype/dejavu ]; then \
        cp /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf apps/reports/fonts/ 2>/dev/null || true; \
        cp /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf apps/reports/fonts/ 2>/dev/null || true; \
    fi

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
