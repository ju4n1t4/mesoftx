from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "User_MS"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(..., min_length=1)

    jwt_secret_key: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # Comunicación entre microservicios (paso 12).
    assesment_ms_url: str = "http://assesment-ms:8002"
    service_token: str = Field(..., min_length=1)

    cors_origins: str = ""

    # --- Límite de intentos de login (OWASP ASVS V2.2) ---
    login_max_attempts: int = 5            # fallos por correo dentro de la ventana
    login_max_attempts_per_ip: int = 30    # fallos por IP dentro de la ventana
    login_window_seconds: int = 900
    # Solo True detrás de un proxy de confianza (nginx del compose): usa X-Forwarded-For.
    trust_proxy_headers: bool = False

    # --- Seguridad adicional ---
    jwt_issuer: str = "mesoftx-user-ms"
    jwt_audience: str = "mesoftx-api"
    # None = automático: /docs, /redoc y /openapi.json solo fuera de producción.
    enable_docs: bool | None = None

    # --- Modo exposición (sin login) ---
    # APAGADO por defecto. Solo para sustentaciones/demostraciones con DATOS DE EJEMPLO:
    # quien llegue al sitio entra con el perfil que elija, sin credenciales.
    demo_mode: bool = False
    # En producción exige además esta confirmación explícita (doble llave).
    demo_allow_in_production: bool = False

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() in {"production", "prod", "produccion", "producción"}

    @property
    def docs_enabled(self) -> bool:
        return self.enable_docs if self.enable_docs is not None else not self.is_production

    @model_validator(mode="after")
    def reject_demo_in_production_without_ack(self) -> "Settings":
        if self.demo_mode and self.is_production and not self.demo_allow_in_production:
            raise ValueError(
                "DEMO_MODE=true en producción abre el acceso sin credenciales. Si es una exposición con datos "
                "de ejemplo, confirme con DEMO_ALLOW_IN_PRODUCTION=true; de lo contrario deje DEMO_MODE=false."
            )
        return self

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
