from collections.abc import Generator

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.infrastructure.database.session import get_db
from app.infrastructure.repositories.sqlalchemy_repositories import UserRepository
from app.infrastructure.security.jwt_service import InvalidTokenError, decode_access_token

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def db_session() -> Generator[Session, None, None]:
    yield from get_db()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(db_session)):
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = UserRepository(db).get_by_id(user_id)
    if not user or not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or missing user.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Permisos efectivos del usuario, tomados de su rol (fuente de verdad en BD).
    user.permissions = [rp.permission.code for rp in user.role.role_permissions]
    return user


def require_permission(code: str):
    """Autoriza solo si el usuario autenticado tiene el permiso indicado (paso 15)."""

    def checker(current_user=Depends(get_current_user)):
        if code not in getattr(current_user, "permissions", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Falta el permiso {code}",
            )
        return current_user

    return checker


def require_service_token(x_service_token: str | None = Header(default=None)):
    """Valida el secreto compartido entre microservicios (paso 12)."""
    if x_service_token != settings.service_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de servicio inválido")
