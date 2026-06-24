FROM python:3.12-slim

LABEL org.opencontainers.image.title="Assesment_MS"
LABEL org.opencontainers.image.description="MesoftX ABET assesment management microservice."

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system appuser \
    && useradd --system --gid appuser --home-dir /app appuser

COPY backend/Assesment_MS/requirements.txt ./requirements.txt

RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY backend/Assesment_MS/app ./app
COPY backend/Assesment_MS/README.md ./README.md
COPY backend/Assesment_MS/requeriments.md ./requeriments.md

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
