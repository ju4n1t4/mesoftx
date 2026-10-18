import os
import pathlib
import sys

SERVICE_DIR = pathlib.Path(__file__).resolve().parents[2] / "Assesment_MS"
sys.path.insert(0, str(SERVICE_DIR))

# Variables mínimas para importar la app sin base de datos real (la conexión es perezosa).
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://test:test@localhost:5432/test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-test-secret-key-0123456789")
os.environ.setdefault("SERVICE_TOKEN", "test-service-token-test-service-token-01")
os.environ.setdefault("APP_ENV", "test")
