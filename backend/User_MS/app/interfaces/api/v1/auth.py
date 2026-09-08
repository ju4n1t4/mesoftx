from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.auth_service import AuthService, GoogleAuthenticationError, InactiveUserError, InvalidCredentialsError
from app.core.config import get_settings
from app.infrastructure.repositories.sqlalchemy_repositories import UserRepository
from app.infrastructure.security.google_identity_service import GoogleIdentityService
from app.infrastructure.security.jwt_service import JwtTokenService
from app.infrastructure.security.password_service import BcryptPasswordService
from app.interfaces.api.v1.dependencies import db_session
from app.interfaces.api.v1.schemas import GoogleLoginRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(payload: LoginRequest, db: Session = Depends(db_session)) -> TokenResponse:
    service = AuthService(
        UserRepository(db),
        BcryptPasswordService(),
        JwtTokenService(),
        GoogleIdentityService(settings.google_client_id),
    )
    try:
        token = service.login(payload.email, payload.password)
        return TokenResponse(access_token=token)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except InactiveUserError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/google", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(db_session)) -> TokenResponse:
    service = AuthService(
        UserRepository(db),
        BcryptPasswordService(),
        JwtTokenService(),
        GoogleIdentityService(settings.google_client_id),
    )
    try:
        token = service.login_with_google(payload.id_token)
        return TokenResponse(access_token=token)
    except GoogleAuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except InactiveUserError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
