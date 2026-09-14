from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.application.services.catalog_service import CatalogService
from app.infrastructure.repositories.sqlalchemy_repositories import (
    CollegeRepository,
    EntityAlreadyExistsError,
    EntityNotFoundError,
    PeriodRepository,
    PermissionRepository,
    ProgramRepository,
    RoleRepository,
    SubjectRepository,
    TeacherSubjectRepository,
)
from app.interfaces.api.v1.dependencies import db_session, get_current_user, require_permission
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import (
    CollegeCreate,
    CollegeResponse,
    CollegeUpdate,
    PeriodCreate,
    PeriodResponse,
    PeriodUpdate,
    PermissionResponse,
    ProgramCreate,
    ProgramResponse,
    ProgramUpdate,
    RoleCreate,
    RolePermissionsUpdate,
    RoleResponse,
    RoleUpdate,
    SubjectCreate,
    SubjectResponse,
    SubjectUpdate,
    TeacherSubjectCreate,
    TeacherSubjectResponse,
)

router = APIRouter(tags=["Catalogs"], dependencies=[Depends(get_current_user)])


def _service(repository_class: type[Any], db: Session) -> CatalogService:
    return CatalogService(repository_class(db))


# ── Perfiles (roles) — admin: USER_CRUD ─────────────────────
@router.get("/roles", response_model=list[RoleResponse])
def list_roles(db: Session = Depends(db_session), _=Depends(require_permission("USER_CRUD"))):
    return _service(RoleRepository, db).list()


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleCreate, db: Session = Depends(db_session), _=Depends(require_permission("USER_CRUD"))):
    try:
        return _service(RoleRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/roles/{entity_id}", response_model=RoleResponse)
def update_role(entity_id: int, payload: RoleUpdate, db: Session = Depends(db_session), _=Depends(require_permission("USER_CRUD"))):
    try:
        return _service(RoleRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/roles/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(entity_id: int, db: Session = Depends(db_session), _=Depends(require_permission("USER_CRUD"))):
    repo = RoleRepository(db)
    count = repo.count_users(entity_id)
    if count > 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"El perfil tiene {count} usuarios asignados")
    if not repo.delete(entity_id):
        raise map_repository_error(EntityNotFoundError("Role not found."))
    return None


@router.get("/permissions", response_model=list[PermissionResponse])
def list_permissions(db: Session = Depends(db_session), _=Depends(require_permission("USER_CRUD"))):
    return _service(PermissionRepository, db).list()


@router.put("/roles/{entity_id}/permissions", response_model=RoleResponse)
def set_role_permissions(
    entity_id: int,
    payload: RolePermissionsUpdate,
    db: Session = Depends(db_session),
    _=Depends(require_permission("PERMISSION_ASSIGN")),
):
    perm_ids = PermissionRepository(db).ids_for_codes(payload.permission_codes)
    role = RoleRepository(db).set_permissions(entity_id, perm_ids)
    if not role:
        raise map_repository_error(EntityNotFoundError("Role not found."))
    return role


# ── Facultades / Programas / Periodos — PROGRAM_CRUD ────────
@router.get("/colleges", response_model=list[CollegeResponse])
def list_colleges(db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    return _service(CollegeRepository, db).list()


@router.post("/colleges", response_model=CollegeResponse, status_code=status.HTTP_201_CREATED)
def create_college(payload: CollegeCreate, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    try:
        return _service(CollegeRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/colleges/{entity_id}", response_model=CollegeResponse)
def update_college(entity_id: str, payload: CollegeUpdate, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    try:
        return _service(CollegeRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/colleges/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_college(entity_id: str, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    if not CollegeRepository(db).delete(entity_id):
        raise map_repository_error(EntityNotFoundError("College not found."))
    return None


@router.get("/programs", response_model=list[ProgramResponse])
def list_programs(db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    return _service(ProgramRepository, db).list()


@router.post("/programs", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(payload: ProgramCreate, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    try:
        return _service(ProgramRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/programs/{entity_id}", response_model=ProgramResponse)
def update_program(entity_id: str, payload: ProgramUpdate, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    try:
        return _service(ProgramRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/programs/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(entity_id: str, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    if not ProgramRepository(db).delete(entity_id):
        raise map_repository_error(EntityNotFoundError("Program not found."))
    return None


@router.get("/periods", response_model=list[PeriodResponse])
def list_periods(db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    return _service(PeriodRepository, db).list()


@router.post("/periods", response_model=PeriodResponse, status_code=status.HTTP_201_CREATED)
def create_period(payload: PeriodCreate, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    try:
        return _service(PeriodRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/periods/{entity_id}", response_model=PeriodResponse)
def update_period(entity_id: int, payload: PeriodUpdate, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    try:
        return _service(PeriodRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/periods/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_period(entity_id: int, db: Session = Depends(db_session), _=Depends(require_permission("PROGRAM_CRUD"))):
    if not PeriodRepository(db).delete(entity_id):
        raise map_repository_error(EntityNotFoundError("Period not found."))
    return None


# ── Materias — SUBJECT_CRUD ─────────────────────────────────
@router.get("/subjects", response_model=list[SubjectResponse])
def list_subjects(db: Session = Depends(db_session), _=Depends(require_permission("SUBJECT_CRUD"))):
    return _service(SubjectRepository, db).list()


@router.get("/subjects/{nrc}", response_model=SubjectResponse)
def get_subject(nrc: int, db: Session = Depends(db_session), _=Depends(require_permission("SUBJECT_CRUD"))):
    try:
        return _service(SubjectRepository, db).get(nrc)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(payload: SubjectCreate, db: Session = Depends(db_session), _=Depends(require_permission("SUBJECT_CRUD"))):
    try:
        return _service(SubjectRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/subjects/{nrc}", response_model=SubjectResponse)
def update_subject(nrc: int, payload: SubjectUpdate, db: Session = Depends(db_session), _=Depends(require_permission("SUBJECT_CRUD"))):
    try:
        return _service(SubjectRepository, db).update(nrc, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/subjects/{nrc}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(nrc: int, db: Session = Depends(db_session), _=Depends(require_permission("SUBJECT_CRUD"))):
    # NOTA (paso 12): el borrado cruzado de rúbricas/schedule_subjects de este NRC
    # queda pendiente de cablear con AssesmentMsClient. Ver reporte del Bloque D.
    if not SubjectRepository(db).delete(nrc):
        raise map_repository_error(EntityNotFoundError("Subject not found."))
    return None


# ── Asignar NRC a profesor — SUBJECT_CRUD ───────────────────
@router.post("/teacher-subjects", response_model=TeacherSubjectResponse, status_code=status.HTTP_201_CREATED)
def assign_teacher_subject(
    payload: TeacherSubjectCreate,
    db: Session = Depends(db_session),
    current_user=Depends(require_permission("SUBJECT_CRUD")),
):
    data = payload.model_dump()
    data["assigned_by"] = current_user.id
    try:
        return TeacherSubjectRepository(db).create(data)
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc
