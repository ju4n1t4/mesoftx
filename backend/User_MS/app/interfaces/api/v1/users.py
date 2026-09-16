from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.user_service import UserService
from app.infrastructure.clients.assesment_ms_client import AssesmentMsClient
from app.infrastructure.repositories.sqlalchemy_repositories import (
    EntityAlreadyExistsError,
    EntityNotFoundError,
    RoleRepository,
    UserRepository,
)
from app.interfaces.api.v1.dependencies import db_session, get_current_user, require_permission
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"], dependencies=[Depends(get_current_user)])

# Quién puede crear a quién (paso 13). Keyea por PERMISO del que llama y NOMBRE
# del rol destino, porque los roles son dinámicos (los crea el admin).
ALLOWED_TARGET_ROLES = {
    "USER_CRUD": {"Coordinador"},
    "TEACHER_CRUD": {"Profesor", "Auditor"},
}


def _is_teacher_role(role_name: str) -> bool:
    return role_name.strip().lower().startswith("profesor")


def _is_target_role_allowed(target_role_name: str, permissions: list[str]) -> bool:
    allowed: set[str] = set()
    for permission, roles in ALLOWED_TARGET_ROLES.items():
        if permission in permissions:
            allowed |= roles
    return target_role_name in allowed or ("Profesor" in allowed and _is_teacher_role(target_role_name))


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(db_session),
    current_user=Depends(get_current_user),
) -> list[UserResponse]:
    perms = getattr(current_user, "permissions", [])
    if "USER_CRUD" not in perms and "TEACHER_CRUD" not in perms:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    users = UserService(UserRepository(db)).list()
    return [UserResponse.from_model(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(db_session),
    current_user=Depends(get_current_user),
) -> UserResponse:
    perms = getattr(current_user, "permissions", [])
    if "USER_CRUD" not in perms and "TEACHER_CRUD" not in perms and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this user.")
    try:
        user = UserService(UserRepository(db)).get(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(db_session),
    current_user=Depends(get_current_user),
) -> UserResponse:
    perms = getattr(current_user, "permissions", [])
    if "USER_CRUD" not in perms and "TEACHER_CRUD" not in perms:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")

    target_role = RoleRepository(db).get_by_id(payload.role_id)
    if not target_role:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="role_id inexistente")

    if not _is_target_role_allowed(target_role.name, perms):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No puede crear usuarios con el rol {target_role.name}",
        )

    # program_id es obligatorio SOLO para Profesor; se ignora/rechaza para el resto.
    if _is_teacher_role(target_role.name) and not payload.program_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="program_id es obligatorio para Profesor")
    if not _is_teacher_role(target_role.name) and payload.program_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Solo el Profesor pertenece a un programa")

    data = payload.model_dump()
    data["created_by"] = current_user.id
    try:
        user = UserService(UserRepository(db)).create(data)
        return UserResponse.from_model(user)
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(db_session),
    _=Depends(require_permission("TEACHER_CRUD")),
) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).update(user_id, payload.model_dump(exclude_unset=True))
        return UserResponse.from_model(user)
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(db_session),
    _=Depends(require_permission("TEACHER_CRUD")),
):
    """Borra un profesor/auditor. Antes borra en cascada sus rúbricas en
    Assesment_MS; si hay periodos cerrados -> 409; si el servicio no responde
    -> 503 y no borra nada (paso 12)."""
    repo = UserRepository(db)
    if not repo.get_by_id(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    import httpx

    client = AssesmentMsClient()
    try:
        ok, closed = await client.delete_rubrics(evaluator_user_id=user_id)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de valoraciones no disponible; no se borró nada",
        ) from exc
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tiene valoraciones en periodos cerrados: {', '.join(closed)}",
        )
    repo.delete(user_id)
    return None


@router.patch("/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(db_session),
    _=Depends(require_permission("TEACHER_CRUD")),
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
    _=Depends(require_permission("TEACHER_CRUD")),
) -> UserResponse:
    try:
        user = UserService(UserRepository(db)).deactivate(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc
