from collections.abc import Generator

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.infrastructure.database.session import get_db
from app.infrastructure.security.jwt_service import InvalidTokenError, decode_access_token

settings = get_settings()
# El login real ocurre en User_MS; aquí tokenUrl es solo referencia para OpenAPI.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def db_session() -> Generator[Session, None, None]:
    yield from get_db()


class CurrentUser:
    def __init__(
        self,
        user_id: int,
        role_id: int,
        email: str,
        role: str | None = None,
        program_id: str | None = None,
        permissions: list[str] | None = None,
    ):
        self.user_id = user_id
        self.role_id = role_id
        self.email = email
        self.role = role
        self.program_id = program_id
        self.permissions = permissions or []


def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """Verifica el JWT localmente con el secreto compartido (no llama a User_MS)."""
    try:
        payload = decode_access_token(token)
        return CurrentUser(
            user_id=int(payload["sub"]),
            role_id=int(payload["role_id"]),
            email=payload["email"],
            role=payload.get("role"),
            program_id=payload.get("program_id"),
            permissions=payload.get("perms", []),
        )
    except (InvalidTokenError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_permission(code: str):
    """Autoriza solo si el usuario autenticado tiene el permiso indicado (paso 15)."""

    def checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if code not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Falta el permiso {code}",
            )
        return current_user

    return checker


def require_service_token(x_service_token: str | None = Header(default=None)) -> None:
    """Valida el secreto compartido entre microservicios (paso 12)."""
    if x_service_token != settings.service_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de servicio inválido")
