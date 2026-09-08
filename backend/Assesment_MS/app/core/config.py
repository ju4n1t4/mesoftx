from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Assesment_MS"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(..., min_length=1)
    document_base_url: str = ""
    document_support_assesment: str = ""
    cors_origins: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @model_validator(mode="after")
    def set_document_paths(self) -> "Settings":
        if not self.document_support_assesment and self.document_base_url:
            self.document_support_assesment = str(Path(self.document_base_url) / "ASSESMENT")
        return self

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def assesment_document_path(self) -> Path:
        configured_path = self.document_support_assesment or str(Path(self.document_base_url) / "ASSESMENT")
        return Path(configured_path).expanduser()


@lru_cache
def get_settings() -> Settings:
    return Settings()
