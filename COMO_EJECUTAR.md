# Cómo ejecutar MESOFTX en local

Guía paso a paso para levantar el proyecto completo desde cero: base de datos,
microservicios backend y frontend.

El sistema se levanta **en este orden**:

1. Docker Desktop (motor de contenedores)
2. Base de datos PostgreSQL (contenedor)
3. Microservicios backend: User_MS y Assesment_MS (contenedores)
4. Frontend Angular (servidor de desarrollo)

---

## 0. Requisitos previos (una sola vez)

```bash
docker --version
node --version
npm --version
```

- Docker Desktop (reciente) → https://www.docker.com/products/docker-desktop
- Node.js 18+ → https://nodejs.org (versión LTS)

---

## 1. Iniciar Docker Desktop

```bash
open -a Docker
```

Espera a que diga "Docker Desktop is running" y confirma:

```bash
docker info
```

---

## 2. Levantar la base de datos

Crea la red `mesoftx-network`, arranca PostgreSQL 16 y carga las tablas y el
usuario inicial.

```bash
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/deployment/db
docker compose up -d --build
```

Verifica que esté "healthy":

```bash
docker ps --filter name=mesoftx-db
```

> Los datos quedan en el volumen `mesoftx_postgres_data` y no se pierden al
> apagar los contenedores.

### Qué cargan los scripts SQL

En el **primer** arranque (volumen vacío), PostgreSQL ejecuta en orden los 4
scripts de `deployment/db/scripts/`:

| Script | Qué hace |
|---|---|
| `01_create_db.sql` | Crea las dos bases: `users_db` y `assesment_mesoftx_db` |
| `02_create_tables_users.sql` | Crea las 11 tablas de `users_db` (college, program, periods, roles, permissions, role_permissions, users, students, subjects, students_subjects, teacher_subjects) |
| `03_create_tables_assesment.sql` | Crea las 7 tablas de `assesment_mesoftx_db` (so, performance, level, so_schedule, schedule_subjects, rubric, evidence) |
| `04_bootstrap.sql` | Inserta los 18 permisos, el rol `Administrativo` y el usuario administrador (`admin@unab.edu.co`, con clave temporal de desarrollo que debe cambiarse; ver paso 5) |

Para volver a ejecutarlos desde cero hay que borrar el volumen:

```bash
docker compose down -v && docker compose up -d --build
```

### Añadir la tabla `period_target` a una base ya inicializada

Los scripts SQL solo se ejecutan en el primer arranque (volumen vacío). Si tu
base ya existe y no quieres recrearla, crea la tabla de la meta de logro a mano
contra `assesment_mesoftx_db`:

```bash
docker exec -i mesoftx-db psql -U postgres -d assesment_mesoftx_db <<'SQL'
CREATE TABLE IF NOT EXISTS period_target (
    period_id   integer   PRIMARY KEY,
    target_pct  smallint  NOT NULL,
    updated_by  integer   NOT NULL,
    updated_at  timestamp NOT NULL DEFAULT current_timestamp,
    CONSTRAINT ck_period_target_pct CHECK (target_pct BETWEEN 1 AND 100)
);
SQL
```

Si prefieres recrear todo desde cero, borra el volumen con el comando de arriba
y la tabla se crea sola con el resto del esquema.

---

## 3. Levantar los microservicios backend

Van después de la DB porque comparten la misma red.

```bash
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/deployment/backend
docker compose up -d --build
```

Verifica (espera ~20 s a que estén "healthy"):

```bash
docker ps
curl http://localhost:8001/health
curl http://localhost:8002/health
```

- **User_MS**: http://localhost:8001 · docs: http://localhost:8001/docs
- **Assesment_MS**: http://localhost:8002 · docs: http://localhost:8002/docs

> `deployment/backend/.env` habilita CORS para el puerto 4200. Si no existe,
> créalo con:
> ```
> USER_MS_CORS_ORIGINS=http://localhost:4200,http://localhost:3000,http://localhost:5173
> ASSESMENT_MS_CORS_ORIGINS=http://localhost:4200,http://localhost:3000,http://localhost:5173
> ```

---

## 4. Levantar el frontend

### Opcion A: Docker

```bash
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/deployment/frontend
docker compose up -d --build
```

Abre **http://localhost:8083**. El Nginx del contenedor enruta
`/user-api/v1` a `user-ms:8001/api/v1` y `/assesment-api/v1` a
`assesment-ms:8002/api/v1` dentro de `mesoftx-network`.

### Opcion B: Angular dev server

```bash
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/frontend
npm install
npx ng serve --port 4200 -o
```

Abre **http://localhost:4200** cuando aparezca "Watch mode enabled".

---

## 5. Cómo entrar a la aplicación

No existen botones de acceso rápido ni cuentas de demostración: **todo ingreso es con
correo y contraseña reales** (la vista pública `/publico` es la única sin sesión y solo
muestra datos agregados y anónimos).

### Primer ingreso (administrador)
La base recién creada trae un único usuario: `admin@unab.edu.co`, con una contraseña
**temporal conocida solo para desarrollo** (está en `04_bootstrap.sql`). Antes de usar la
aplicación, **defina la clave real**:

```bash
docker compose exec -it user-ms python -m app.tools.set_password admin@unab.edu.co
```

Pide la nueva clave por consola (mínimo 10 caracteres, con letras y números; no se acepta
una clave de lista de claves comunes). En producción (`APP_ENV=production`) el sistema
**bloquea el inicio de sesión** de cualquier cuenta que aún tenga la clave temporal.

> Nunca escriba claves reales en este archivo, en el README ni en capturas de pantalla
> de la memoria o la sustentación.

### Resto de perfiles
Los perfiles (Coordinador, Profesor, Auditor) y sus usuarios se crean desde la aplicación
(el Administrador crea perfiles/permisos y usuarios; el Coordinador crea a los Profesores).
Al crear un usuario se define una clave inicial; cada persona debe cambiarla en
**Mi cuenta → Cambiar contraseña**. No hay recuperación de clave por correo: la restablece
el coordinador o el administrador.

### Permisos mínimos recomendados por perfil
Los perfiles son dinámicos (los define el Administrador). Para que cada pantalla cargue:

| Perfil | Permisos de lectura que no deben faltar |
|---|---|
| Profesor | `MY_COURSES_VIEW`, `STUDENT_UPLOAD`, `SO_TO_ASSESS_VIEW`, `RUBRIC_VIEW`, `RUBRIC_FILL`, `EVIDENCE_UPLOAD`, `INDICATOR_VIEW`, `INDICATOR_CHART` |
| Coordinador | todos excepto los propios del profesor, más `SO_TO_ASSESS_VIEW` y `RUBRIC_VIEW` para ver la programación y las rúbricas |
| Auditor | `DASHBOARD_*`, `INDICATOR_CHART`, `RUBRIC_VIEW` (solo lectura) |

Reglas de autorización:
- Solo el **Coordinador** crea usuarios con perfil Profesor; un Coordinador no puede crear
  cuentas Administrador (403).
- Un permiso faltante devuelve 403 y la pantalla correspondiente lo indica.

---

## 5b. Verificar la estructura de la base de datos (opcional)

`backend/tests/verify_db_structure.py` comprueba que la base recién creada
tiene el modelo v13 correcto: las 18 tablas, los 18 permisos, el rol y el
usuario administrador, y que no quedan tablas del modelo antiguo. Se ejecuta
contra la base ya levantada (paso 2) y **debe dar 92 passed**.

```bash
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/backend

# dependencias (una sola vez)
pip install pytest psycopg2-binary

# apunta a las dos bases (puerto local 5432)
export USERS_DB_URL="postgresql://postgres:postgres@localhost:5432/users_db"
export ASSESMENT_DB_URL="postgresql://postgres:postgres@localhost:5432/assesment_mesoftx_db"

pytest tests/verify_db_structure.py -v
```

Los tests que insertan datos lo hacen dentro de una transacción que se revierte
al terminar: la base queda igual que antes. Si algún test falla, el error está
en los scripts SQL, no en el test (ese archivo no se modifica).

> Este mismo chequeo corre automáticamente en CI: ver
> `.github/workflows/tests.yml`. Cada push y cada PR levanta PostgreSQL 16,
> ejecuta los 4 scripts y corre estos tests; el workflow falla si no da 91.

---

## 6. Apagar todo al terminar

Frontend: `Ctrl + C` en su terminal.

```bash
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/deployment/backend
docker compose down

cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/deployment/db
docker compose down
```

> `docker compose down` no borra los datos (siguen en el volumen). Para empezar
> de cero borrando datos: `docker compose down -v` en `deployment/db`.

---

## 7. Chuleta ultra rápida

```bash
# 1. Docker
open -a Docker            # y esperar a que arranque

# 2. Base de datos
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/deployment/db
docker compose up -d --build

# 3. Backend
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/deployment/backend
docker compose up -d --build

# 4. Frontend
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/frontend
npx ng serve --port 4200 -o
```

Abrir **http://localhost:4200** e iniciar sesión con las credenciales reales (paso 5).

---

## 8. Solución de problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `Cannot connect to the Docker daemon` | Docker Desktop apagado | `open -a Docker` y esperar |
| Backend no arranca / "network mesoftx-network not found" | La DB no se levantó primero | Levantar `deployment/db` antes que el backend |
| Errores de CORS en el navegador | Frontend en puerto no permitido | Usar el 4200 (ya habilitado en `deployment/backend/.env`) |
| Puerto 4200 ocupado | Otra instancia de `ng serve` | Cerrarla o usar `--port 4300` |
| Vistas de métricas vacías | BD recién creada sin valoraciones | Es lo esperado; registrar datos desde la app |
| Login falla con los 3 usuarios | La BD se creó con un seed antiguo | Recrear con datos frescos: `docker compose down -v` en `deployment/db` y volver a levantar |

Ver logs si algo falla:

```bash
docker logs user-ms
docker logs assesment-ms
docker logs mesoftx-db
```
