import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.application.services.auth_service import (
    AuthService, DefaultPasswordError, InactiveUserError, InvalidCredentialsError,
)
from app.core.http_security import client_ip
from app.infrastructure.repositories.sqlalchemy_repositories import UserRepository
from app.infrastructure.security.login_rate_limiter import get_login_rate_limiter
from app.interfaces.api.v1.dependencies import db_session
from app.interfaces.api.v1.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
audit = logging.getLogger("mesoftx.audit")


def _mask(email: str) -> str:
    """j***@unab.edu.co — la bitácora no guarda el correo completo."""
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}" if domain else "***"


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(payload: LoginRequest, request: Request, db: Session = Depends(db_session)) -> TokenResponse:
    ip = client_ip(request)
    limiter = get_login_rate_limiter()

    wait = limiter.retry_after(payload.email, ip)
    if wait:
        audit.warning("LOGIN_THROTTLED user=%s ip=%s retry_after=%ss", _mask(payload.email), ip, wait)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos. Intente de nuevo más tarde.",
            headers={"Retry-After": str(wait)},
        )

    service = AuthService(UserRepository(db))
    try:
        token = service.login(payload.email, payload.password)
    except InvalidCredentialsError as exc:
        limiter.register_failure(payload.email, ip)
        audit.warning("LOGIN_FAILED user=%s ip=%s", _mask(payload.email), ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except InactiveUserError as exc:
        limiter.register_failure(payload.email, ip)
        audit.warning("LOGIN_INACTIVE user=%s ip=%s", _mask(payload.email), ip)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except DefaultPasswordError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    limiter.register_success(payload.email)
    audit.info("LOGIN_OK user=%s ip=%s", _mask(payload.email), ip)
    return TokenResponse(access_token=token)
