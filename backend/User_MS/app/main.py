from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.infrastructure.database.session import engine
from app.interfaces.api.v1.router import api_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="User management microservice for MesoftX.",
)

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
    )


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


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
