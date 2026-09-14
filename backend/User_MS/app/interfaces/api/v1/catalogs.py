from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.application.services.catalog_service import CatalogService
from app.infrastructure.repositories.sqlalchemy_repositories import (
    EntityAlreadyExistsError,
    EntityNotFoundError,
    RoleRepository,
)
from app.core.roles import Role
from app.interfaces.api.v1.dependencies import db_session, get_current_user, require_roles
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import (
    RoleCreate,
    RoleResponse,
    RoleUpdate,
)

router = APIRouter(tags=["Catalogs"], dependencies=[Depends(get_current_user)])

# La consulta de catálogos (GET) queda disponible para cualquier usuario
# autenticado, ya que el frontend los usa para poblar selectores. La creación y
# edición (POST/PUT) es parametrización: solo Admin y Coordinador. El Docente no
# puede modificar catálogos; su trabajo se limita a registrar valoraciones.
require_parametrizador = require_roles(Role.ADMIN, Role.COORDINADOR)


def _service(repository_class: type[Any], db: Session) -> CatalogService:
    return CatalogService(repository_class(db))


@router.get("/roles", response_model=list[RoleResponse])
def list_roles(db: Session = Depends(db_session)):
    return _service(RoleRepository, db).list()


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleCreate, db: Session = Depends(db_session), _=Depends(require_parametrizador)):
    try:
        return _service(RoleRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/roles/{entity_id}", response_model=RoleResponse)
def update_role(entity_id: int, payload: RoleUpdate, db: Session = Depends(db_session), _=Depends(require_parametrizador)):
    try:
        return _service(RoleRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc
