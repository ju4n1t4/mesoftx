from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.application.ports.repositories import EntityAlreadyExistsError, EntityNotFoundError
from app.application.services.catalog_service import AcademicPeriodService, CatalogService
from app.infrastructure.repositories.sqlalchemy_repositories import (
    AcademicPeriodRepository,
    CareerRepository,
    FacultyRepository,
    PeriodRepository,
    RoleRepository,
    SubjectRepository,
    YearRepository,
)
from app.interfaces.api.v1.dependencies import db_session, get_current_user
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import (
    AcademicPeriodCreate,
    AcademicPeriodResponse,
    AcademicPeriodUpdate,
    CareerCreate,
    CareerResponse,
    CareerUpdate,
    FacultyCreate,
    FacultyResponse,
    FacultyUpdate,
    PeriodCreate,
    PeriodResponse,
    PeriodUpdate,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
    SubjectCreate,
    SubjectResponse,
    SubjectUpdate,
    YearCreate,
    YearResponse,
    YearUpdate,
)

router = APIRouter(tags=["Catalogs"], dependencies=[Depends(get_current_user)])


def _service(repository_class: type[Any], db: Session) -> CatalogService:
    return CatalogService(repository_class(db))


@router.get("/roles", response_model=list[RoleResponse])
def list_roles(db: Session = Depends(db_session)):
    return _service(RoleRepository, db).list()


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleCreate, db: Session = Depends(db_session)):
    try:
        return _service(RoleRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/roles/{entity_id}", response_model=RoleResponse)
def update_role(entity_id: int, payload: RoleUpdate, db: Session = Depends(db_session)):
    try:
        return _service(RoleRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/years", response_model=list[YearResponse])
def list_years(db: Session = Depends(db_session)):
    return _service(YearRepository, db).list()


@router.post("/years", response_model=YearResponse, status_code=status.HTTP_201_CREATED)
def create_year(payload: YearCreate, db: Session = Depends(db_session)):
    try:
        return _service(YearRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/years/{entity_id}", response_model=YearResponse)
def update_year(entity_id: int, payload: YearUpdate, db: Session = Depends(db_session)):
    try:
        return _service(YearRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/periods", response_model=list[PeriodResponse])
def list_periods(db: Session = Depends(db_session)):
    return _service(PeriodRepository, db).list()


@router.post("/periods", response_model=PeriodResponse, status_code=status.HTTP_201_CREATED)
def create_period(payload: PeriodCreate, db: Session = Depends(db_session)):
    try:
        return _service(PeriodRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/periods/{entity_id}", response_model=PeriodResponse)
def update_period(entity_id: int, payload: PeriodUpdate, db: Session = Depends(db_session)):
    try:
        return _service(PeriodRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/academic-periods", response_model=list[AcademicPeriodResponse])
def list_academic_periods(db: Session = Depends(db_session)):
    return _service(AcademicPeriodRepository, db).list()


@router.post("/academic-periods", response_model=AcademicPeriodResponse, status_code=status.HTTP_201_CREATED)
def create_academic_period(payload: AcademicPeriodCreate, db: Session = Depends(db_session)):
    try:
        service = AcademicPeriodService(AcademicPeriodRepository(db), PeriodRepository(db), YearRepository(db))
        return service.create(payload.model_dump())
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.put("/academic-periods/{entity_id}", response_model=AcademicPeriodResponse)
def update_academic_period(entity_id: int, payload: AcademicPeriodUpdate, db: Session = Depends(db_session)):
    try:
        service = AcademicPeriodService(AcademicPeriodRepository(db), PeriodRepository(db), YearRepository(db))
        return service.update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/faculty", response_model=list[FacultyResponse])
def list_faculty(db: Session = Depends(db_session)):
    return _service(FacultyRepository, db).list()


@router.post("/faculty", response_model=FacultyResponse, status_code=status.HTTP_201_CREATED)
def create_faculty(payload: FacultyCreate, db: Session = Depends(db_session)):
    try:
        return _service(FacultyRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/faculty/{entity_id}", response_model=FacultyResponse)
def update_faculty(entity_id: int, payload: FacultyUpdate, db: Session = Depends(db_session)):
    try:
        return _service(FacultyRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/careers", response_model=list[CareerResponse])
def list_careers(db: Session = Depends(db_session)):
    return _service(CareerRepository, db).list()


@router.post("/careers", response_model=CareerResponse, status_code=status.HTTP_201_CREATED)
def create_career(payload: CareerCreate, db: Session = Depends(db_session)):
    try:
        return _service(CareerRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/careers/{entity_id}", response_model=CareerResponse)
def update_career(entity_id: int, payload: CareerUpdate, db: Session = Depends(db_session)):
    try:
        return _service(CareerRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/careers/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_career(entity_id: int, db: Session = Depends(db_session)):
    try:
        _service(CareerRepository, db).delete(entity_id)
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc


@router.get("/subjects", response_model=list[SubjectResponse])
def list_subjects(db: Session = Depends(db_session)):
    return _service(SubjectRepository, db).list()


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(payload: SubjectCreate, db: Session = Depends(db_session)):
    try:
        return _service(SubjectRepository, db).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise map_repository_error(exc) from exc


@router.put("/subjects/{entity_id}", response_model=SubjectResponse)
def update_subject(entity_id: int, payload: SubjectUpdate, db: Session = Depends(db_session)):
    try:
        return _service(SubjectRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise map_repository_error(exc) from exc
