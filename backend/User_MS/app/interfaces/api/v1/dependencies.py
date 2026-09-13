from collections.abc import Generator

from fastapi import Depends, HTTPException, status
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
    return user


def require_roles(*allowed_role_ids: int):
    """Autoriza la petición solo si el usuario autenticado tiene uno de los roles indicados."""

    def _dependency(current_user=Depends(get_current_user)):
        if current_user.role_id not in allowed_role_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this operation.",
            )
        return current_user

    return _dependency
