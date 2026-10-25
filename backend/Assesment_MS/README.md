# Assesment_MS

Microservicio de evaluacion ABET construido con Python 3, FastAPI y arquitectura hexagonal.

## Run local

```bash
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

API docs:

- Swagger: `http://localhost:8002/docs`
- OpenAPI JSON: `http://localhost:8002/openapi.json`

## Refactorización y operación

Arquitectura, migraciones compatibles, configuración, cuentas demo y recuperación: [guía operativa](../../docs/REFACTORIZACION_Y_OPERACION.md). Contratos exportados en [docs/contracts](../../docs/contracts). Application define puertos/casos de uso; SQLAlchemy, clientes y seguridad pertenecen a infrastructure. El arranque no ejecuta migraciones; actualizar bases existentes explícitamente después de respaldo.

Validación con PostgreSQL aislado desde la raíz: `bash scripts/test_backend.sh` (ambas URLs de prueba obligatorias); umbral >=90% de funciones por MS.
