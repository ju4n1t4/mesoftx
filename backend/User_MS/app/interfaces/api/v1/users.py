from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.user_service import UserService
from app.infrastructure.repositories.sqlalchemy_repositories import (
    EntityAlreadyExistsError,
    EntityNotFoundError,
    UserRepository,
)
from app.core.roles import Role
from app.interfaces.api.v1.dependencies import db_session, get_current_user, require_roles
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"], dependencies=[Depends(get_current_user)])

# El listado y la consulta de usuarios exponen datos sensibles: solo Admin y
# Coordinador. La gestión del ciclo de vida (alta, activación, desactivación) es
# función exclusivamente administrativa.
require_staff = require_roles(Role.ADMIN, Role.COORDINADOR)
require_admin = require_roles(Role.ADMIN)


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(db_session),
    _=Depends(require_staff),
) -> list[UserResponse]:
    users = UserService(UserRepository(db)).list()
    return [UserResponse.from_model(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(db_session),
    current_user=Depends(get_current_user),
) -> UserResponse:
    # Admin y Coordinador pueden ver cualquier perfil; el resto solo el propio.
    if current_user.role_id not in (Role.ADMIN, Role.COORDINADOR) and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this user.",
        )
    try:
        user = UserService(UserRepository(db)).get(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(db_session),
    current_user=Depends(require_staff),
) -> UserResponse:
    # El alta de usuarios queda habilitada para Admin y Coordinador. Para evitar
    # una escalada de privilegios, un Coordinador no puede crear cuentas con rol
    # Admin: solo un Admin puede otorgar el rol administrador.
    if current_user.role_id != Role.ADMIN and payload.role_id == Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an administrator can create users with the Admin role.",
        )
    try:
        user = UserService(UserRepository(db)).create(payload.model_dump())
        return UserResponse.from_model(user)
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(db_session),
    _=Depends(require_admin),
) -> UserResponse:
    # La modificación de usuarios (incluidos rol y programa) es una función
    # exclusivamente administrativa. Al exigir Admin para toda la operación se
    # elimina cualquier vía de auto-promoción: un Coordinador o Docente no puede
    # editarse a sí mismo para cambiar su role_id ni alterar a terceros.
    try:
        user = UserService(UserRepository(db)).update(user_id, payload.model_dump(exclude_unset=True))
        return UserResponse.from_model(user)
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.patch("/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(db_session),
    _=Depends(require_admin),
) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).activate(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc


@router.patch("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(db_session),
    _=Depends(require_admin),
) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).deactivate(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc
