from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.auth_service import AuthService, InactiveUserError, InvalidCredentialsError
from app.infrastructure.repositories.sqlalchemy_repositories import UserRepository
from app.interfaces.api.v1.dependencies import db_session
from app.interfaces.api.v1.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(payload: LoginRequest, db: Session = Depends(db_session)) -> TokenResponse:
    service = AuthService(UserRepository(db))
    try:
        token = service.login(payload.email, payload.password)
        return TokenResponse(access_token=token)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except InactiveUserError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
