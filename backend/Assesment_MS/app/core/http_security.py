"""
Cabeceras HTTP de seguridad y bitácora de auditoría de negocio (OWASP A05 / A09).

- Cabeceras: nosniff, anti-clickjacking, sin referrer, sin caché de respuestas de la API.
- Auditoría: registra quién (id de usuario del JWT), qué (método + ruta *plantilla*,
  sin parámetros ni cuerpo), resultado y desde dónde. NUNCA registra tokens,
  contraseñas ni datos personales de estudiantes.
"""
import logging

from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.infrastructure.security.jwt_service import InvalidTokenError, decode_access_token

audit_logger = logging.getLogger("mesoftx.audit")
_MUTATING = {"POST", "PUT", "PATCH", "DELETE"}
_DOC_PATHS = ("/docs", "/redoc", "/openapi.json")


def client_ip(request) -> str:
    settings = get_settings()
    if getattr(settings, "trust_proxy_headers", False):
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        h = response.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "no-referrer")
        h.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        if not request.url.path.startswith(_DOC_PATHS):
            h.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
            h.setdefault("Cache-Control", "no-store")
        return response


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.method in _MUTATING:
            user = "anonymous"
            auth = request.headers.get("authorization", "")
            if auth.lower().startswith("bearer "):
                try:
                    user = str(decode_access_token(auth[7:]).get("sub", "unknown"))
                except InvalidTokenError:
                    user = "invalid-token"
            route = request.scope.get("route")
            path = getattr(route, "path", None) or "unmatched"
            audit_logger.info(
                "AUDIT user=%s method=%s route=%s status=%s ip=%s",
                user, request.method, path, response.status_code, client_ip(request),
            )
        return response


def configure_logging() -> None:
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
