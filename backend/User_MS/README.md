# User_MS

Microservicio de usuarios construido con Python 3, FastAPI, JWT y arquitectura hexagonal.

El login principal del frontend usa Google Identity Services. Configurar `GOOGLE_CLIENT_ID` con el OAuth Client ID de Google antes de usar `/api/v1/auth/google`. El correo verificado por Google debe existir como usuario activo en `users_db`.

## Ejecucion Local

```bash
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Documentacion API:

- Swagger: `http://localhost:8001/docs`
- OpenAPI JSON: `http://localhost:8001/openapi.json`
