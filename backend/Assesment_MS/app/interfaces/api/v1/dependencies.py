from collections.abc import Generator

from fastapi import Depends, HTTPException, status
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
    def __init__(self, user_id: int, role_id: int, email: str):
        self.user_id = user_id
        self.role_id = role_id
        self.email = email


def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    try:
        payload = decode_access_token(token)
        return CurrentUser(
            user_id=int(payload["sub"]),
            role_id=int(payload["role_id"]),
            email=payload["email"],
        )
    except (InvalidTokenError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_roles(*allowed_role_ids: int):
    def _dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role_id not in allowed_role_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this operation.",
            )
        return current_user

    return _dependency
