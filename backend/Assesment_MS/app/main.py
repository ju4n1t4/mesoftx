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
    description="ABET assesment management microservice for MesoftX.",
)


@app.on_event("startup")
def apply_lightweight_migrations() -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            DO $$
            BEGIN
                IF to_regclass('public.performance') IS NOT NULL THEN
                    ALTER TABLE performance ALTER COLUMN id TYPE VARCHAR(20);
                    ALTER TABLE performance ADD COLUMN IF NOT EXISTS code VARCHAR(20);
                    UPDATE performance SET code = id WHERE code IS NULL OR code = '';
                    ALTER TABLE performance ALTER COLUMN code SET NOT NULL;
                    CREATE SEQUENCE IF NOT EXISTS performance_internal_id_seq;
                    IF (SELECT COUNT(*) FROM performance) > 0 THEN
                        PERFORM setval(
                            'performance_internal_id_seq',
                            GREATEST(
                                COALESCE((SELECT MAX(id::integer) FROM performance WHERE id ~ '^[0-9]+$'), 0),
                                (SELECT COUNT(*) FROM performance)
                            ),
                            true
                        );
                    ELSE
                        PERFORM setval('performance_internal_id_seq', 1, false);
                    END IF;
                    ALTER TABLE performance ALTER COLUMN id SET DEFAULT nextval('performance_internal_id_seq')::text;
                END IF;
                IF to_regclass('public.level') IS NOT NULL THEN
                    ALTER TABLE level ALTER COLUMN performance_id TYPE VARCHAR(20);
                END IF;
                IF to_regclass('public.rubric') IS NOT NULL THEN
                    ALTER TABLE rubric ALTER COLUMN performance_id TYPE VARCHAR(20);
                END IF;
            END $$;
        """))

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


app.include_router(api_router, prefix=settings.api_v1_prefix)
