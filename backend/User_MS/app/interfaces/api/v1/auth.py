import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.application.services.auth_service import (
    AuthService, DefaultPasswordError, DemoUnavailableError, InactiveUserError, InvalidCredentialsError,
)
from app.core.http_security import client_ip
from app.infrastructure.repositories.sqlalchemy_repositories import UserRepository
from app.infrastructure.security.login_rate_limiter import get_login_rate_limiter
from app.interfaces.api.v1.dependencies import db_session
from app.core.config import get_settings
from app.interfaces.api.v1.schemas import AuthModeResponse, DemoLoginRequest, LoginRequest, TokenResponse

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


@router.get("/mode", response_model=AuthModeResponse)
def auth_mode(db: Session = Depends(db_session)) -> AuthModeResponse:
    """Público. Indica si el servidor está en modo exposición (sin login) y qué perfiles ofrece."""
    if not get_settings().demo_mode:
        return AuthModeResponse(demo_enabled=False)
    roles = AuthService(UserRepository(db)).available_demo_roles()
    return AuthModeResponse(demo_enabled=bool(roles), demo_roles=roles)


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(payload: DemoLoginRequest, request: Request, db: Session = Depends(db_session)) -> TokenResponse:
    """Solo con DEMO_MODE=true. Con el modo apagado responde 404 como si no existiera."""
    if not get_settings().demo_mode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    ip = client_ip(request)
    limiter = get_login_rate_limiter()
    wait = limiter.retry_after("demo-login", ip)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Intente de nuevo más tarde.",
            headers={"Retry-After": str(wait)},
        )
    try:
        token = AuthService(UserRepository(db)).demo_login(payload.role.strip().lower())
    except DemoUnavailableError as exc:
        limiter.register_failure("demo-login", ip)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    audit.warning("DEMO_LOGIN role=%s ip=%s", payload.role.strip().lower(), ip)
    return TokenResponse(access_token=token)
