# MESOFTX

Plataforma web de apoyo al proceso de acreditación ABET en la Universidad Autónoma de
Bucaramanga (UNAB). Permite registrar la valoración de los resultados de aprendizaje
(*student outcomes*) por parte de los profesores, consolidar los indicadores de desempeño
y consultar los resultados agregados desde la Coordinación de Acreditación.

El sistema trabaja con cuatro roles: **Profesor** (llena rúbricas y carga estudiantes de
sus cursos), **Coordinador** (gestiona programas, materias, profesores y la programación
de los *student outcomes*), **Administrativo** (crea usuarios y perfiles, y asigna
permisos) y **Auditor** (consulta indicadores y resultados en modo solo lectura).

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
| Usuarios | `GET`/`POST`/`PUT` sobre `/api/v1/users`, más `PATCH /{id}/activate` y `/{id}/deactivate` |
| Roles y permisos | `/api/v1/roles`, `/api/v1/permissions`, `GET`/`PUT` `/api/v1/roles/{id}/permissions` |
| Catálogos | `/api/v1/colleges`, `/programs`, `/periods`, `/subjects` |
| Profesor | `/api/v1/me/subjects`, `/api/v1/me/subjects/pending` |
| Estudiantes | `/api/v1/subjects/{nrc}/students`, asignación profesor-materia (`/teacher-subjects`) |
| Público (temporal) | `GET /api/v1/public/roles` |

Todos los endpoints exigen `Authorization: Bearer <token>`, salvo `/health`, el login y
el endpoint público temporal de roles. La autorización se controla por permisos asociados
al rol del usuario. Las contraseñas se almacenan con bcrypt.

### Assesment_MS

| Grupo | Rutas |
|---|---|
| Student outcomes | `GET`/`POST`/`PUT`/`DELETE` `/api/v1/so` |
| Indicadores y niveles | `/api/v1/performance`, `/api/v1/performance/{id}/levels`, `/api/v1/level` |
| Programación de SO | `/api/v1/so-schedule`, `/so-schedule/{id}/subjects`, `PATCH /so-schedule/{id}/status` |
| Valoración | `GET /api/v1/me/assessments`, `GET`/`POST`/`PUT` `/api/v1/rubric` |
| Evidencias (futura) | `POST /api/v1/evidence` |
| Dashboards e indicadores | `/api/v1/dashboard/program`, `/dashboard/so`, `/dashboard/teacher`, `/indicators/chart` |

Igual que User_MS, los endpoints exigen token JWT y se autorizan por permiso. La
comunicación interna entre microservicios usa un token de servicio (`/internal/...`).

## Modelo de datos (v13)

El esquema se reparte en **dos bases** con **18 tablas** en total. Los estudiantes no son
usuarios: viven en su propia tabla (`students`), no inician sesión ni tienen contraseña.

`users_db` (11 tablas): `college`, `program`, `periods`, `roles`, `permissions`,
`role_permissions`, `users`, `students`, `subjects`, `students_subjects`,
`teacher_subjects`.

`assesment_mesoftx_db` (7 tablas): `so` (student outcome), `performance` (indicador),
`level` (nivel de la rúbrica), `so_schedule` (programación de un SO en un periodo),
`schedule_subjects` (NRC medidos por esa programación), `rubric` (valoración registrada)
y `evidence`.

La **programación de student outcomes** (`so_schedule`) sigue una máquina de estados:
`PLANIFICADO` → `EN_CURSO` → `CERRADO`. El coordinador abre la valoración (a `EN_CURSO`),
la cierra (a `CERRADO`) o la reabre; los profesores solo pueden valorar mientras está en
`EN_CURSO`. Un SO no puede volver a `PLANIFICADO` si ya tiene rúbricas registradas.

Las referencias entre servicios (por ejemplo `so.college_id` → `users_db.college.id`) se
resuelven por identificador, sin duplicar datos entre bases.

## Frontend

Aplicación Angular con componentes *standalone* y carga diferida por ruta. El acceso se
controla con dos guardas: `authGuard` (token válido) y `roleGuard` (rol declarado en la
ruta). El interceptor `jwt.interceptor.ts` adjunta el token a cada petición saliente.

| Zona | Ruta base | Roles |
|---|---|---|
| Landing | `/` | pública |
| Consulta pública de resultados | `/publico` | pública |
| Profesor | `/profesor` | Profesor, Administrativo |
| Coordinador | `/coordinador` | Coordinador, Administrativo |
| Administrativo | `/admin` | Administrativo |
| Auditor | `/auditor` | Auditor |

El módulo del profesor cubre sus cursos asignados, la carga de estudiantes por NRC, los
student outcomes que le toca valorar y el llenado de la rúbrica. El de coordinación cubre
programas, profesores, materias, asignación de materias, resultados de aprendizaje,
programación de SO, dashboards de avance e indicadores. El módulo administrativo gestiona
perfiles, permisos y usuarios; el de auditoría muestra las gráficas de indicadores y los
resultados de rúbricas en solo lectura.

## Estado actual y limitaciones conocidas

- `GET /api/v1/public/roles` y los botones de acceso demo del login son temporales para
  la defensa. Deben retirarse cuando se exija usuario para todo el acceso.
- El frontend no forma parte de `deployment/`: se construye con su propio `Dockerfile`.
  El bloque `location /api/` de `nginx.conf` debe apuntar a ambos microservicios en un
  proxy inverso real.
- El esquema se crea mediante scripts SQL; no hay migraciones versionadas. Para recrearlo
  desde cero hay que eliminar el volumen `mesoftx_postgres_data`.

## Autoría

Juliana Ramírez Arenas
Luis Mauricio Mosquera Cifuentes
Máster Universitario de Ingeniería de Software y Sistemas de Información
Universidad Internacional de La Rioja (UNIR).
