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
