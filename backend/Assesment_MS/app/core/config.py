from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Assesment_MS"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(..., min_length=1)

    jwt_secret_key: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"

    # Comunicación entre microservicios (paso 12).
    user_ms_url: str = "http://user-ms:8001"
    service_token: str = Field(..., min_length=1)

    cors_origins: str = ""

    # --- Vista pública (RF-08 a RF-10): solo datos agregados ---
    # Un SO con menos de este número de estudiantes distintos NO se publica
    # (evita reidentificar personas en grupos pequeños; minimización, Ley 1581 art. 4).
    public_min_group_size: int = 5
    public_rate_limit_per_minute: int = 60

    # --- Seguridad adicional ---
    trust_proxy_headers: bool = False   # True solo detrás del nginx del compose
    jwt_issuer: str = "mesoftx-user-ms"
    jwt_audience: str = "mesoftx-api"
    # None = automático: /docs, /redoc y /openapi.json solo fuera de producción.
    enable_docs: bool | None = None

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() in {"production", "prod", "produccion", "producción"}

    @property
    def docs_enabled(self) -> bool:
        return self.enable_docs if self.enable_docs is not None else not self.is_production

    @model_validator(mode="after")
    def reject_placeholder_secrets_in_production(self) -> "Settings":
        """En producción no se arranca con secretos de ejemplo (OWASP A02/A05)."""
        if self.is_production:
            for name, value in (("JWT_SECRET_KEY", self.jwt_secret_key), ("SERVICE_TOKEN", self.service_token)):
                low = value.lower()
                if low.startswith(("change-this", "genera-un", "changeme", "secret", "password")) or len(value) < 32:
                    raise ValueError(
                        f"{name} es un valor de ejemplo o muy corto. En producción genere uno con: "
                        "python -c \"import secrets; print(secrets.token_urlsafe(48))\""
                    )
        return self

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
