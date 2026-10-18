from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.core.http_security import AuditMiddleware, SecurityHeadersMiddleware, configure_logging
from app.infrastructure.database.session import engine
from app.interfaces.api.v1.router import api_router

settings = get_settings()
configure_logging()

# En producción no se publica la documentación interactiva ni el esquema OpenAPI.
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="User management microservice for MesoftX.",
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

app.add_middleware(AuditMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.on_event("startup")
def warn_if_demo_mode() -> None:
    if settings.demo_mode:
        import logging

        logging.getLogger("mesoftx.audit").critical(
            "MODO EXPOSICIÓN ACTIVO: el acceso sin credenciales está habilitado (DEMO_MODE=true, env=%s). "
            "Úselo solo con datos de ejemplo y apáguelo al terminar.", settings.app_env,
        )


@app.on_event("startup")
def ensure_period_active_column() -> None:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE periods ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("UPDATE periods SET active = FALSE WHERE active IS NULL"))
        active_count = conn.execute(text("SELECT COUNT(*) FROM periods WHERE active = TRUE")).scalar() or 0
        if active_count == 0:
            conn.execute(text("""
                UPDATE periods
                SET active = TRUE
                WHERE id = (
                    SELECT id FROM periods ORDER BY code DESC, id DESC LIMIT 1
                )
            """))
        elif active_count > 1:
            conn.execute(text("""
                UPDATE periods
                SET active = CASE
                    WHEN id = (SELECT id FROM periods WHERE active = TRUE ORDER BY code DESC, id DESC LIMIT 1)
                    THEN TRUE ELSE FALSE
                END
            """))


app.include_router(api_router, prefix=settings.api_v1_prefix)
