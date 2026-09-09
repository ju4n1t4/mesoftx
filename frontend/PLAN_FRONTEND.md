# Plan de Frontend MESOFTX — Seguimiento

Estado de implementación de las pantallas del frontend Angular 18 según el diseño de alta fidelidad.

Leyenda: ✅ hecho · 🔄 en revisión/ajuste · ⬜ pendiente

---

## Base / Infraestructura

- [x] Estructura `src/` (app.config, app.routes, main.ts, index.html)
- [x] Sistema de tokens de diseño en `styles.scss` (tema claro, naranja UNAB #FFA502, morado #7C3AED)
- [x] Modelos TypeScript (`abet.models.ts`)
- [x] `AuthService` (login real + demo docente/coordinador)
- [x] Interceptor JWT + guards (auth, role)
- [x] `UserApiService` (puerto 8001) y `AssesmentApiService` (puerto 8002)
- [x] Layout Docente (sidebar oscuro + topbar + logout en menú)
- [x] Layout Coordinador (sidebar oscuro + topbar + logout en menú)
- [x] Redirección al entrar como Docente → `/docente/inicio`
- [x] Cerrar sesión desde el sidebar (ambos perfiles)

## Autenticación

- [x] Login (panel naranja + Google + correo/contraseña + accesos demo)

## Módulo Docente

| Pantalla | Ruta | Estado |
|---|---|---|
| Inicio · Acreditación | `/docente/inicio` | ✅ conectada a API real (se ve vacía sin datos) |
| Dashboard | `/docente/dashboard` | ✅ |
| Registrar valoración (rúbrica) | `/docente/valoraciones` | ✅ S.O.1 preseleccionado, footer fijo |
| Mis estudiantes | `/docente/mis-estudiantes` | ✅ tabla precargada + carga CSV |
| Mis indicadores | `/docente/indicadores` | ✅ radar SVG + tabla |
| Ayuda y soporte | `/docente/soporte` | ✅ canales + recursos + FAQ |

## Módulo Coordinador

| Pantalla | Ruta | Estado |
|---|---|---|
| Dashboard | `/coordinador/dashboard` | ✅ KPIs + avance por programa + acciones |
| Programas | `/coordinador/programas` | ✅ grid 2 col + cumplimiento ABET |
| Docentes | `/coordinador/docentes` | ✅ tabla con avance |
| Student Outcomes (parametrización) | `/coordinador/student-outcomes` | ✅ S.O.1 con rúbrica, resto vacío |
| Valoraciones | `/coordinador/valoraciones` | ✅ stats + tabla estados |
| Configuración | `/coordinador/configuracion` | ✅ 4 bloques |
| Auditoría | `/coordinador/auditoria` | 🔄 existe, revisar vs diseño |
| Informes (Power BI) | `/coordinador/informes` | 🔄 contenedor placeholder |
| Periodos | `/coordinador/periodos` | 🔄 existe, revisar vs diseño |

## Vista Pública

- [x] Vista pública ABET (`/publico`)
- [x] Landing (`/`)

---

## Pendientes / Por revisar

- [ ] Revisar Auditoría, Informes y Periodos del coordinador vs diseño (no estaban en el menú de 6 ítems)
- [ ] Integración real de valoraciones docente → backend (POST rúbrica)
- [ ] Parseo real de CSV/Excel en "Mis estudiantes"
- [ ] OAuth Google en login
- [ ] Power BI Embedded en Informes

---

_Última actualización: seguimiento manual durante desarrollo._
