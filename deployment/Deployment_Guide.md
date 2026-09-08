# Guia De Despliegue Local MESOFTX

Este documento describe como levantar base de datos, backend y frontend en Docker Compose desde la carpeta `deployment`.

## Requisitos

- Docker Desktop activo.
- Puertos locales disponibles: `5432`, `8001`, `8002` y `4200`.
- Archivos `.env` creados desde sus plantillas.

## Orden De Arranque

La base de datos debe levantarse primero porque crea la red Docker `mesoftx-network`, usada por backend y frontend.

1. Base de datos.
2. Backend.
3. Frontend.

## Variables Y Credenciales

### Base De Datos

Archivo:

```bash
deployment/db/.env
```

Crear desde plantilla:

```bash
cd deployment/db
copy .env.example .env
```

Valores locales por defecto:

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
```

Bases creadas por los scripts:

- `users_db`
- `assesment_mesoftx_db`

### Backend

Archivo:

```bash
deployment/backend/.env
```

Crear desde plantilla:

```bash
cd deployment/backend
copy .env.example .env
```

Valores locales principales:

```text
USER_MS_PORT=8001
USER_MS_DATABASE_URL=postgresql+psycopg2://postgres:postgres@mesoftx-db:5432/users_db
USER_MS_JWT_SECRET_KEY=change-this-jwt-secret-with-at-least-32-chars
USER_MS_GOOGLE_CLIENT_ID=replace-with-google-oauth-client-id.apps.googleusercontent.com

ASSESMENT_MS_PORT=8002
ASSESMENT_MS_DATABASE_URL=postgresql+psycopg2://postgres:postgres@mesoftx-db:5432/assesment_mesoftx_db
ASSESMENT_MS_DOCUMENT_HOST_BASE_URL=./documents/MESOFTX
ASSESMENT_MS_DOCUMENT_BASE_URL=/app/documents/MESOFTX
ASSESMENT_MS_DOCUMENT_SUPPORT_ASSESMENT=/app/documents/MESOFTX/ASSESMENT
```

En produccion se deben cambiar `POSTGRES_PASSWORD`, las cadenas `DATABASE_URL`, `USER_MS_JWT_SECRET_KEY` y `USER_MS_GOOGLE_CLIENT_ID`.

### Frontend

Archivo:

```bash
deployment/frontend/.env
```

Crear desde plantilla:

```bash
cd deployment/frontend
copy .env.example .env
```

Valor local por defecto:

```text
FRONTEND_PORT=4200
```

## Usuario Administrador Inicial

Los scripts de base de datos crean un usuario administrador local:

```text
Correo: admin@mesoftx.local
Contrasena: AdminMesoftx2026!
Rol: Admin
Estado: activo
```

Este usuario se inserta en `users_db` con password almacenado en bcrypt. El rol `Admin` representa acceso total funcional para esta etapa del proyecto; los endpoints protegidos de `User_MS` validan JWT y todavia no aplican una matriz granular de permisos por rol.

Cambiar esta credencial inmediatamente fuera de entornos locales.

## Levantar Base De Datos

Desde la raiz del repositorio `mesoftx`:

```bash
cd deployment/db
docker compose up --build -d
```

Validar:

```bash
docker compose ps
docker logs mesoftx-db
```

## Levantar Backend

La base de datos debe estar arriba antes de ejecutar este paso.

```bash
cd ../backend
docker compose up --build -d
```

Servicios expuestos:

- `User_MS`: `http://localhost:8001`
- `Assesment_MS`: `http://localhost:8002`

Validar salud:

```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
```

Probar login administrador:

```bash
curl -X POST http://localhost:8001/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@mesoftx.local\",\"password\":\"AdminMesoftx2026!\"}"
```

La respuesta debe incluir:

```json
{
  "access_token": "jwt-token",
  "token_type": "bearer"
}
```

## Levantar Frontend

```bash
cd ../frontend
docker compose up --build -d
```

URL:

```text
http://localhost:4200
```

## Comandos De Detencion

Detener frontend:

```bash
cd deployment/frontend
docker compose down
```

Detener backend:

```bash
cd deployment/backend
docker compose down
```

Detener base de datos sin borrar datos:

```bash
cd deployment/db
docker compose down
```

## Reiniciar Datos Locales

Usar solo si se quiere eliminar el volumen local y volver a ejecutar los scripts SQL desde cero:

```bash
cd deployment/db
docker compose down -v
docker compose up --build -d
```

Despues de reiniciar la DB, levantar de nuevo backend y frontend si estaban detenidos.

## Validacion General

```bash
cd deployment/db
docker compose config

cd ../backend
docker compose config

cd ../frontend
docker compose config
```

Los tres comandos deben resolver sin errores.
