# User_MS

Microservicio de usuarios construido con Python 3, FastAPI, JWT y arquitectura hexagonal.

## Ejecucion Local

```bash
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Documentacion API:

- Swagger: `http://localhost:8001/docs`
- OpenAPI JSON: `http://localhost:8001/openapi.json`
