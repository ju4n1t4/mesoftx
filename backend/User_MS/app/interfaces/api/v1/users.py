from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.application.services.user_service import UserService
from app.infrastructure.repositories.sqlalchemy_repositories import (
    EntityAlreadyExistsError,
    EntityNotFoundError,
    UserRepository,
)
from app.interfaces.api.v1.dependencies import db_session, get_current_user
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(db_session)) -> list[UserResponse]:
    users = UserService(UserRepository(db)).list()
    return [UserResponse.from_model(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(db_session)) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).get(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(db_session)) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).create(payload.model_dump())
        return UserResponse.from_model(user)
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(db_session)) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).update(user_id, payload.model_dump(exclude_unset=True))
        return UserResponse.from_model(user)
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.patch("/{user_id}/activate", response_model=UserResponse)
def activate_user(user_id: int, db: Session = Depends(db_session)) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).activate(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc


@router.patch("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(user_id: int, db: Session = Depends(db_session)) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).deactivate(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc
