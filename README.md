# MESOFTX

Plataforma web de apoyo al proceso de acreditación ABET en la Universidad Autónoma de
Bucaramanga (UNAB). Permite registrar la valoración de los resultados de aprendizaje
(*student outcomes*) por parte de los docentes, consolidar los indicadores de desempeño
y consultar los resultados agregados desde la Coordinación de Acreditación.

Desarrollada como Trabajo de Fin de Máster (Máster en Desarrollo de Software, UNIR).

## Arquitectura

El sistema se compone de tres piezas desplegables de forma independiente:

| Componente | Tecnología | Puerto local |
|---|---|---|
| `User_MS` — usuarios, autenticación y catálogos académicos | Python 3.12, FastAPI, SQLAlchemy, JWT, bcrypt | 8001 |
| `Assesment_MS` — valoración ABET (outcomes, indicadores, evidencias, resultados) | Python 3.12, FastAPI, SQLAlchemy | 8002 |
| Frontend | Angular 18, PrimeNG 18 | 4200 (dev) / 80 (nginx) |
| Base de datos | PostgreSQL 16 | 5432 |

Cada microservicio sigue arquitectura hexagonal con cuatro capas: `domain` (entidades y
contratos), `application` (casos de uso), `infrastructure` (persistencia, seguridad) e
`interfaces` (adaptadores HTTP). Cada uno posee su propia base de datos: `users_db` y
`assesment_mesoftx_db`.

## Estructura del repositorio

```
backend/
  User_MS/            Microservicio de usuarios, autenticación y catálogos
  Assesment_MS/       Microservicio de valoración ABET
deployment/
  db/                 Imagen de PostgreSQL y scripts de creación e inserción
  backend/            Compose y Dockerfiles de los dos microservicios
frontend/             Aplicación Angular (código fuente, Dockerfile, nginx.conf)
```

## Requisitos

- Docker y Docker Compose, para el despliegue completo.
- Python 3.12 y Node.js 20, si se ejecuta cada pieza fuera de contenedores.

## Puesta en marcha con Docker

La base de datos y el backend se despliegan por separado. **El orden importa**: el
despliegue de la base de datos crea la red `mesoftx-network`, que el backend consume
como red externa.

```bash
# 1. Base de datos
cd deployment/db
cp .env.example .env
docker compose up --build -d

# 2. Microservicios
cd ../backend
cp .env.example .env
docker compose up --build -d
```

Los scripts SQL se ejecutan automáticamente en el primer arranque del contenedor de
PostgreSQL, en este orden: creación de las dos bases, tablas de `assesment_mesoftx_db`,
tablas de `users_db` y datos iniciales de ambas. Para volver a ejecutarlos hay que
eliminar el volumen `mesoftx_postgres_data`.

Comprobación:

```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
```

## Ejecución local sin Docker

Backend (un terminal por microservicio, con la base de datos ya levantada):

```bash
cd backend/User_MS
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

```bash
cd backend/Assesment_MS
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

Frontend:

```bash
cd frontend
npm install
npm start
```

`environment.ts` apunta por defecto a `http://localhost:8001/api/v1` y
`http://localhost:8002/api/v1`; `environment.prod.ts` usa las rutas relativas
`/user-api/v1` y `/assesment-api/v1`, que deben resolverse en el proxy inverso.

## Variables de entorno

Cada componente incluye un `.env.example` con las claves esperadas. Los `.env` reales no
se versionan.

| Variable | Componente | Descripción |
|---|---|---|
| `DATABASE_URL` | ambos MS | Cadena de conexión SQLAlchemy a la base correspondiente |
| `API_V1_PREFIX` | ambos MS | Prefijo de la API, por defecto `/api/v1` |
| `CORS_ORIGINS` | ambos MS | Orígenes permitidos, separados por coma |
| `JWT_SECRET_KEY` | `User_MS` | Clave de firma HS256; usar un secreto propio de al menos 32 caracteres |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `User_MS` | Vigencia del token, por defecto 60 |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_PORT` | `deployment/db` | Credenciales y puerto del contenedor de PostgreSQL |

Las credenciales de los datos iniciales son de uso local y deben cambiarse en cualquier
entorno que no sea de desarrollo.

## API

Documentación interactiva generada por FastAPI:

- `User_MS`: http://localhost:8001/docs
- `Assesment_MS`: http://localhost:8002/docs

### User_MS

| Grupo | Rutas |
|---|---|
| Autenticación | `POST /api/v1/auth/login` |
| Usuarios | `GET`, `POST`, `PUT` sobre `/api/v1/users`, más `PATCH /{id}/activate` y `/{id}/deactivate` |
| Catálogos | `/api/v1/catalogs/roles`, `/years`, `/periods`, `/academic-periods`, `/faculty`, `/careers`, `/subjects` |

Todos los endpoints exigen `Authorization: Bearer <token>`, salvo `/health` y el login.
Las contraseñas se almacenan con bcrypt.

### Assesment_MS

| Grupo | Rutas |
|---|---|
| Resultados de aprendizaje | `/api/v1/student-outcomes` |
| Indicadores de desempeño | `/api/v1/performance-indicators` y `/performance-indicator-details` |
| Valoraciones | `/api/v1/performance-evaluations` y `/performance-evaluation-details` |
| Evidencias | `/api/v1/assesment-evidence` |
| Resultados consolidados | `/api/v1/assesment-results` |

## Modelo de datos

`users_db`: `roles`, `years`, `periods`, `academic_periods`, `faculty`, `career`,
`subjects`, `users`, `users_subjects`.

`assesment_mesoftx_db`: `student_outcomes`, `performance_indicators`,
`performance_indicator_details`, `performance_evaluations`,
`performance_evaluation_details`, `assesment_evidence`, `assesment_results`.

## Frontend

Aplicación Angular con componentes *standalone* y carga diferida por ruta. El acceso se
controla con dos guardas: `authGuard` (token válido) y `roleGuard` (rol declarado en la
ruta). El interceptor `jwt.interceptor.ts` adjunta el token a cada petición saliente.

| Zona | Ruta base | Roles |
|---|---|---|
| Landing | `/` | pública |
| Consulta pública de resultados | `/publico` | pública |
| Docente | `/docente` | Docente, Admin |
| Coordinador | `/coordinador` | Coordinador, Admin |

El módulo docente cubre inicio de acreditación, registro de valoraciones, indicadores,
estudiantes asignados y soporte. El de coordinación cubre programas, docentes, periodos,
resultados de aprendizaje, valoraciones, informes, auditoría y configuración.

## Estado actual y limitaciones conocidas

- `Assesment_MS` no exige autenticación JWT; es una decisión de alcance de esta versión
  y debe resolverse antes de cualquier uso real, ya que expone datos de valoración.
- El frontend no forma parte de `deployment/`: se construye con su propio `Dockerfile`.
  El bloque `location /api/` de `nginx.conf` apunta a un único backend en el puerto 8000
  y no corresponde a la separación actual en dos microservicios.
- El esquema se crea mediante scripts SQL; no hay migraciones versionadas.

## Autoría

Juliana Ramírez Arenas
Luis Mauricio Mosquera Cifuentes
Máster Universitario de Ingeniería de Software y Sistemas de Información
Universidad Internacional de La Rioja (UNIR).
