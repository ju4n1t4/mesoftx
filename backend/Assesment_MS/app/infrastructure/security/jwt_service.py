from typing import Any

import jwt
from jwt import PyJWTError

from app.core.config import get_settings


class InvalidTokenError(Exception):
    pass


def decode_access_token(token: str) -> dict[str, Any]:
    """Verifica firma, expiración, emisor y audiencia del JWT emitido por User_MS."""
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
