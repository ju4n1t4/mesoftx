from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.roles import Role
from app.interfaces.api.v1.dependencies import CurrentUser, get_current_user, require_roles

from app.application.services.catalog_service import CatalogService
from app.infrastructure.repositories.sqlalchemy_repositories import (
    EntityNotFoundError,
    InvalidReferenceError,
    StudentOutcomeRepository,
)
from app.interfaces.api.v1.dependencies import db_session
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import (
    StudentOutcomeCreate,
    StudentOutcomeResponse,
    StudentOutcomeUpdate,
)

router = APIRouter(tags=["Assesment"])

# La parametrización de la rúbrica ABET (student outcomes, indicadores, niveles y
# sus detalles) es una función administrativa: solo Admin y Coordinador pueden
# crear o modificarla. El Docente queda excluido de estas operaciones y únicamente
# registra evidencias y resultados de valoración.
require_parametrization = require_roles(Role.ADMIN, Role.COORDINADOR)


def _service(repository_class: type[Any], db: Session) -> CatalogService:
    return CatalogService(repository_class(db))


@router.get("/student-outcomes", response_model=list[StudentOutcomeResponse])
def list_student_outcomes(db: Session = Depends(db_session)):
    return _service(StudentOutcomeRepository, db).list()


@router.post("/student-outcomes", response_model=StudentOutcomeResponse, status_code=status.HTTP_201_CREATED)
def create_student_outcome(
    payload: StudentOutcomeCreate,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_parametrization),
):
    try:
        return _service(StudentOutcomeRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/student-outcomes/{entity_id}", response_model=StudentOutcomeResponse)
def update_student_outcome(
    entity_id: str,
    payload: StudentOutcomeUpdate,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_parametrization),
):
    try:
        return _service(StudentOutcomeRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc
