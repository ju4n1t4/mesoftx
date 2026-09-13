# Cómo ejecutar MESOFTX en local (guía para la defensa del TFM)

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

Crea la red `mesoftx-network`, arranca PostgreSQL y carga las tablas y los
usuarios iniciales.

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

```bash
cd /Users/julianaramirezarenas/Documents/UNIR/TFM/mesoftx/frontend
npm install
npx ng serve --port 4200 -o
```

Abre **http://localhost:4200** cuando aparezca "Watch mode enabled".

---

## 5. Cómo entrar a la aplicación

### Opción A — Botones de acceso rápido (recomendado para la defensa)
En el login, los botones "Entrar como Docente" / "Entrar como Coordinador"
inician sesión automáticamente contra el backend con los usuarios reales de la
base de datos (no hay que escribir credenciales). Al hacer login real se obtiene
un token JWT válido, por lo que **todas las vistas cargan datos reales**,
incluidas las del coordinador que requieren autenticación.

### Opción B — Inicio de sesión manual (mismo resultado, escribiendo credenciales)
Todos los usuarios comparten la misma contraseña inicial:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@example.com` | `Mesoftx2026!` |
| Coordinador | `orueda741@unab.edu.co` | `Mesoftx2026!` |
| Docente | `jramirez@unab.edu.co` | `Mesoftx2026!` |

> Reglas de autorización relevantes para la demo:
> - **Admin y Coordinador** pueden crear usuarios desde la aplicación.
> - Un **Coordinador NO puede crear cuentas con rol Admin** (error 403, para
>   evitar escalada de privilegios). Solo un Admin puede otorgar el rol Admin.
>
> El resto de datos (Student Outcomes, indicadores, materias, periodos, demás
> usuarios, carreras, evidencias y valoraciones) se crean desde la propia
> aplicación con el perfil de coordinador. Al arrancar limpio, las vistas de
> métricas aparecen vacías hasta que se parametriza y se registran valoraciones.

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

## 7. Chuleta ultra rápida (día de la defensa)

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

Abrir **http://localhost:4200** y usar los botones de acceso rápido.

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
