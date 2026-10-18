import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from jwt import PyJWTError

from app.core.config import get_settings


class InvalidTokenError(Exception):
    pass


def create_access_token(subject: str, claims: dict[str, Any] | None = None, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes))
    payload: dict[str, Any] = {
        **(claims or {}),
        "sub": subject,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
    except PyJWTError as exc:
        raise InvalidTokenError("Invalid or expired token.") from exc
