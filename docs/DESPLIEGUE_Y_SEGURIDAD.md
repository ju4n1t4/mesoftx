# MESOFTX — Despliegue seguro y lista de verificación legal

> Este documento es una guía técnica y de gestión de riesgos. **No es asesoría jurídica.**
> Los textos legales del sitio (`/legal/privacidad`, `/legal/terminos`) son **borrador** y
> deben ser revisados y aprobados por la Oficina Jurídica y el Oficial de Protección de
> Datos de la UNAB antes de publicar.

## 1. Despliegue en producción

```bash
cd deployment
cp .env.prod.example .env.prod          # complete TODOS los valores (secretos >= 32 caracteres)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
# clave real del administrador (la clave semilla queda bloqueada en producción):
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -it user-ms \
  python -m app.tools.set_password admin@unab.edu.co
```

Qué garantiza esta configuración:

| Control | Dónde |
|---|---|
| Solo nginx publica puerto; BD y microservicios en red interna | `docker-compose.prod.yml` |
| `APP_ENV=production`: no arranca con secretos de ejemplo o < 32 caracteres | `core/config.py` |
| `/docs`, `/redoc`, `/openapi.json` desactivados en producción | `main.py` |
| Clave semilla del admin bloqueada en producción | `auth_service.py` |
| Modo exposición apagado por defecto, con doble llave en producción y sin claves en el navegador | `config.py`, `auth.py`, `docker-compose.demo.yml` |
| JWT con `iss`, `aud`, `exp`, `jti` (PyJWT) | `jwt_service.py` |
| Límite de intentos de login (5 por correo / 30 por IP en 15 min → 429) | `login_rate_limiter.py` |
| Política de claves (≥ 10, letras y números, no comunes) y cambio en *Mi cuenta* | `password_policy.py` |
| Cabeceras de seguridad y CSP estricta (API y nginx), HSTS tras proxy TLS | `http_security.py`, `security-headers.conf` |
| Auditoría de escrituras sin datos personales ni tokens | `AuditMiddleware` |
| RBAC por permiso en todos los endpoints (401 sin token, 403 sin permiso) | tests `backend/tests/*` |
| Vista pública agregada, sin datos personales, grupos < 5 suprimidos | `public.py` |
| Sin fuentes/CDN/analítica de terceros (no se envían IP de visitantes a terceros) | `index.html`, `angular.json` |

**HTTPS es obligatorio**: ponga delante un proxy/WAF que termine TLS y envíe
`X-Forwarded-Proto`. Si hay un proxy de confianza delante de nginx, configure
`set_real_ip_from` / `real_ip_header` para que el límite de intentos use la IP real.

**Copias de seguridad:** programe `pg_dump` cifrado de `users_db` y `assesment_mesoftx_db`
(los datos de estudiantes son datos personales; trate las copias con las mismas medidas).

## 1b. Modo exposición (sin login) vs. uso real (con login)

Para la sustentación del TFM se necesita entrar rápido sin credenciales; en la vida real se exige login.
Ambos modos conviven en el mismo código y **el servidor decide** (ver `COMO_EJECUTAR.md`, paso 5):

- **Apagado por defecto** (`DEMO_MODE=false`): `/auth/demo-login` responde 404, `/auth/mode` dice `demo_enabled:false`
  y las cuentas de demostración no pueden iniciar sesión con contraseña. Es el estado del despliegue normal.
- **Encendido** (`DEMO_MODE=true`): el login muestra un botón por perfil. Cada botón pide un **token JWT real**
  (mismo formato, mismos permisos del perfil, misma expiración); los controles de acceso del backend **siguen
  aplicando**: el Auditor no puede crear usuarios, el Profesor no ve datos ajenos, etc.
- **Doble llave en producción:** con `APP_ENV=production` el servicio no arranca con `DEMO_MODE=true` sin
  `DEMO_ALLOW_IN_PRODUCTION=true`. En Docker eso lo aporta únicamente `docker-compose.demo.yml`.
- **Sin secretos en el navegador:** no hay contraseñas en el JS (corrige el hallazgo RS-02). Las cuentas demo
  tienen clave aleatoria desconocida y solo entran por `/auth/demo-login`.
- **Trazabilidad:** cada ingreso queda en la bitácora (`DEMO_LOGIN role=… ip=…`), el arranque registra un aviso
  crítico y la interfaz muestra una etiqueta permanente de "modo exposición".
- **Límite de abuso:** `/auth/demo-login` aplica el mismo limitador por IP que el login (429).

**Riesgo residual (decisión de gestión, no técnica):** mientras el modo exposición esté activo, cualquiera que
alcance el sitio puede entrar con cualquier perfil, incluido el administrativo. Úselo **solo con datos de ejemplo**
(nunca estudiantes reales, Ley 1581), restrinja el acceso de red si es posible (VPN, red de la universidad o URL
no publicada) y **apáguelo al terminar** (comando de la Opción 2). Los textos legales del sitio siguen visibles
en ambos modos.

## 2. Lista de verificación legal (Colombia) — pendiente de la UNAB

| # | Acción | Responsable | Norma / motivo |
|---|---|---|---|
| 1 | Revisión y aprobación de los textos de privacidad y términos; poner `borrador: false` en `legal.config.ts` | Oficina Jurídica UNAB | Ley 1581/2012, Decreto 1074/2015 |
| 2 | Completar NIT, dirección, teléfono, correo oficial de datos y URL de la Política institucional en `legal.config.ts` (el correo `soporte.mesoftx@unab.edu.co` es provisional: confirmar o crear) | UNAB | Art. 17 lit. k y Dec. 1377/2013 (política y aviso) |
| 3 | Confirmar que el tratamiento de datos de estudiantes (documento, nombre, correo, valoraciones) tiene base legal: autorización existente de matrícula/finalidad académica o aviso de privacidad aplicable | Secretaría General / Datos | Art. 4 y 9 Ley 1581 |
| 4 | Verificar registro de la base de datos en el RNBD (si la UNAB está obligada) | Oficial de datos UNAB | Dec. 886/2014 |
| 5 | Si la BD está en Azure fuera de Colombia: confirmar región, cláusulas/contrato de transmisión y nivel adecuado de protección | UNAB / Azure | Art. 26 Ley 1581; Dec. 1377 art. 25 |
| 6 | Procedimiento interno para consultas (10 días hábiles) y reclamos (15 días hábiles) enviados al correo de datos | UNAB | Arts. 14 y 15 Ley 1581 |
| 7 | Titularidad de la propiedad intelectual: acuerdo entre autores, UNIR y UNAB y **licencia** para el repositorio (hoy no hay archivo `LICENSE`) | Autores / UNAB / UNIR | Ley 23/1982; Decisión Andina 351 |
| 8 | No usar marca, logos ni textos de ABET ni de la UNAB sin autorización; el sitio ya declara que no está afiliado ni avalado por ABET | Autores | Marcas — Decisión Andina 486 |
| 9 | Decidir si el sitio será indexable: hoy `noindex, nofollow` (conservador); retirar la metaetiqueta en `index.html` si se desea que aparezca en buscadores | Dirección del proyecto | — |
| 10 | Revisar licencias de dependencias de terceros (`npm ls`, `pip-licenses`) y conservar avisos | Autores | Licencias OSS |

## 3. Higiene del repositorio (antes de hacerlo público o compartirlo)

- El historial de Git contiene la **clave semilla del admin** (`Mesoftx2026!`) y correos reales de
  los autores. Si algún despliegue real usó esa clave, **cámbiela ya**. Para publicar el repositorio,
  o bien manténgalo **privado**, o reescriba el historial (`git filter-repo`) y rote las claves.
- Nunca suba `.env`, `.env.prod`, dumps de BD ni archivos con estudiantes reales (Excel de cargue).
- Las capturas de la memoria/sustentación no deben mostrar datos reales de estudiantes.

## 4. Riesgos residuales conocidos

| Riesgo | Estado |
|---|---|
| Dependencias de **producción**: `npm audit --omit=dev` = 0 vulnerabilidades tras pasar a Angular 20 / PrimeNG 20. Quedan avisos solo en herramientas de desarrollo (webpack-dev-server, braces, uuid) que no se incluyen en el sitio publicado | Repetir `npm audit --omit=dev` antes de cada entrega; planear salto a Angular 21 cuando se estabilice el builder |
| `@primeng/themes` está marcado como obsoleto (migración a `@primeuix/themes`) | Funciona hoy; migrar en una iteración posterior |
| Límites de intentos en memoria (por proceso): se reinician al reiniciar el contenedor y no se comparten entre réplicas | Aceptable con una réplica; usar Redis si se escala |
| No hay recuperación de clave por correo | Decisión de diseño; la restablece el coordinador/admin |
| Sin MFA | Considerar para administradores |
