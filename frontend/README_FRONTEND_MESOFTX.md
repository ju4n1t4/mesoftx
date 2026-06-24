# Frontend MESOFTX — Implementación

Implementación del frontend de **MESOFTX** (Valoración de Resultados de Aprendizaje ABET · Facultad de Ingeniería · UNAB) a partir del diseño de alta fidelidad. Sirve también como **entregable para la memoria del TFM, Cap. 4.1.2 — Descripción del sistema desarrollado**.

## Stack

- **Angular 18** con *standalone components* y *lazy loading* por ruta.
- **PrimeNG 18** + **PrimeIcons** (tema Aura configurado en `app.config.ts`).
- **SCSS** con un sistema de tokens propio (`src/styles.scss`) que replica la marca (naranja UNAB `#FFA502`, morado acreditación `#7C3AED`) y la escala semántica de niveles de logro N1–N4.
- Autenticación **JWT** con `AuthService`, `authGuard` y `roleGuard` (redirección automática por rol).

## Cómo ejecutar

```bash
cd frontend
npm install
npm start        # ng serve → http://localhost:4200
npm run build    # build de producción
```

Acceso de demostración sin backend: en el login, botones **"entrar como Docente"** y **"entrar como Coordinador"** establecen una sesión local para recorrer toda la interfaz.

## Mapa de vistas (las 4 vistas principales del Brief)

| Vista | Ruta | Pantallas implementadas |
|---|---|---|
| Landing | `/` | Portada institucional con acceso a login y a la vista pública |
| Acceso (login) | `/auth/login` | Formulario reactivo con validación, estado de carga y error de credenciales; redirección por rol |
| Módulo docente | `/docente/*` | Dashboard · Registrar valoración (cursos + carga de lista + **rúbrica interactiva**) · Mis indicadores (radar) · Ayuda y soporte |
| Vista pública ABET | `/publico` | Indicadores consolidados por programa y Student Outcome, sin autenticación |
| Panel coordinador/admin | `/coordinador/*` | Dashboard · Programas · Docentes y roles · **Parametrización de la rúbrica** · Valoraciones por curso · Auditoría (filtrable) · Análisis e informes (contenedor Power BI) · Vista pública (gestión) · Periodos · Configuración |

## Componentes UI clave (sección 6 del Brief)

- **Rúbrica de valoración interactiva** (`docente/valoraciones/registrar`): selección de Student Outcome → carga de identificadores y descriptores → valoración por celda de nivel de logro, con progreso por grupo y confirmación visual. Sustituye la matriz de Excel.
- **Parametrización de catálogos** (`coordinador/student-outcomes`): CRUD editable de SO, identificadores (ID) y descriptores por nivel; "Publicar cambios" refleja la rúbrica que ve el docente.
- **Chips de nivel de logro** y **badges de estado** (abierto/pendiente/vencido/validada/borrador) coherentes en todas las vistas, sin depender solo del color (texto + icono).
- **Tablas** de docentes, valoraciones y auditoría (con búsqueda y filtro por SO).
- **Contenedor de Power BI** con estado de carga (`coordinador/informes`).
- **Carga de lista de estudiantes** con autocompletado (reemplazo del BUSCARV).

## Estructura

```
src/app/
  core/        services (auth), guards (auth/role), interceptors (jwt), models (abet.models.ts)
  layout/      docente-layout, coordinador-layout (sidebar + topbar + breadcrumb por ruta)
  features/
    auth/      login (+ alias docente/coordinador)
    landing/   portada
    publico/   vista pública ABET
    docente/   dashboard, valoraciones (cursos/registrar), indicadores, soporte
    coordinador/ dashboard, programas, docentes, student-outcomes, valoraciones,
                 auditoria, informes, vista-publica, periodos, configuracion
```

## Verificación

- `ng build` (desarrollo y producción) compila sin errores con `strictTemplates` y TypeScript estricto activados.
- Los datos son simulados (mock) en cada componente; la integración real se hará contra la API FastAPI (`environment.apiUrl`).

## Notas para la memoria (Cap. 4.1.2)

Cada componente incluye en su cabecera (`/** ... */`) la referencia al flujo del Brief y al entregable de la memoria. Las capturas para la memoria pueden tomarse ejecutando `ng serve` y recorriendo las rutas anteriores con los accesos de demostración.
