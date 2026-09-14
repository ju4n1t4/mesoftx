from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.catalog_service import CatalogService
from app.infrastructure.clients.user_ms_client import UserMsClient
from app.infrastructure.repositories.sqlalchemy_repositories import (
    EntityNotFoundError,
    EvidenceRepository,
    InvalidReferenceError,
    LevelRepository,
    PerformanceRepository,
    RubricRepository,
    SoScheduleRepository,
    StudentOutcomeRepository,
)
from app.interfaces.api.v1.dependencies import (
    CurrentUser,
    db_session,
    get_current_user,
    require_permission,
)
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import (
    AssessmentToDoResponse,
    EvidenceCreate,
    EvidenceResponse,
    LevelCreate,
    LevelResponse,
    LevelUpdate,
    PerformanceCreate,
    PerformanceResponse,
    PerformanceUpdate,
    RubricCreate,
    RubricResponse,
    RubricUpdate,
    ScheduleStatusUpdate,
    ScheduleSubjectsUpdate,
    SoScheduleCreate,
    SoScheduleResponse,
    StudentOutcomeCreate,
    StudentOutcomeResponse,
    StudentOutcomeUpdate,
)

router = APIRouter(tags=["Assesment"])

_SERVICE_DOWN = HTTPException(
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    detail="Servicio de usuarios no disponible",
    headers={"Retry-After": "5"},
)


def _service(repository_class: type[Any], db: Session) -> CatalogService:
    return CatalogService(repository_class(db))


async def _teacher_nrcs_or_none(user: CurrentUser) -> list[int] | None:
    """Alcance (paso 13): si el usuario es Profesor (único con program_id), devuelve
    la lista de sus NRC para filtrar; si es Coordinador/Auditor devuelve None (sin
    filtro). Los NRC se piden a User_MS en una sola llamada."""
    if user.program_id is None:
        return None
    try:
        return await UserMsClient().teacher_subjects(user.user_id)
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc


# ── Student Outcomes — SO_CRUD ──────────────────────────────
@router.get("/so", response_model=list[StudentOutcomeResponse])
def list_so(db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    return _service(StudentOutcomeRepository, db).list()


@router.post("/so", response_model=StudentOutcomeResponse, status_code=status.HTTP_201_CREATED)
def create_so(payload: StudentOutcomeCreate, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    try:
        return _service(StudentOutcomeRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/so/{so_id}", response_model=StudentOutcomeResponse)
def update_so(so_id: str, payload: StudentOutcomeUpdate, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    try:
        return _service(StudentOutcomeRepository, db).update(so_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/so/{so_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_so(so_id: str, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    repo = RubricRepository(db)
    # EXCEPCIÓN histórico cerrado: si alcanza rúbricas de periodos CERRADO -> 409.
    closed = _closed_periods_for_so(db, so_id)
    if closed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"No se puede borrar: tiene valoraciones en periodos cerrados: {', '.join(closed)}")
    if not StudentOutcomeRepository(db).delete(so_id):
        raise map_repository_error(EntityNotFoundError("SO not found."))
    return None


def _closed_periods_for_so(db: Session, so_id: str) -> list[str]:
    from sqlalchemy import select
    from app.infrastructure.database.models import RubricModel, SoScheduleModel
    stmt = (
        select(SoScheduleModel.period_id)
        .join(RubricModel, RubricModel.schedule_id == SoScheduleModel.id)
        .where(SoScheduleModel.so_id == so_id, SoScheduleModel.status == "CERRADO")
        .distinct()
    )
    return [str(p) for p in db.scalars(stmt).all()]


# ── Indicadores / Niveles — INDICATOR_VIEW ──────────────────
@router.get("/performance", response_model=list[PerformanceResponse])
def list_performance(so_id: str, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("INDICATOR_VIEW"))):
    return PerformanceRepository(db).list_by_so(so_id)


@router.get("/performance/{performance_id}/levels", response_model=list[LevelResponse])
def list_levels(performance_id: str, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("INDICATOR_VIEW"))):
    return LevelRepository(db).list_by_performance(performance_id)


# Escritura de indicadores y niveles: parte del CRUD del student outcome (paso 7,
# punto 5). Mismo permiso SO_CRUD. Borrar aplica la guarda del paso 6: 409 si
# alcanzaría rúbricas en un periodo CERRADO.
@router.post("/performance", response_model=PerformanceResponse, status_code=status.HTTP_201_CREATED)
def create_performance(payload: PerformanceCreate, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    try:
        return PerformanceRepository(db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/performance/{performance_id}", response_model=PerformanceResponse)
def update_performance(performance_id: str, payload: PerformanceUpdate, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    try:
        result = PerformanceRepository(db).update(performance_id, payload.model_dump(exclude_unset=True))
        if result is None:
            raise EntityNotFoundError("Performance not found.")
        return result
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/performance/{performance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_performance(performance_id: str, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    closed = RubricRepository(db).closed_periods_for_performance(performance_id)
    if closed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"No se puede borrar: tiene valoraciones en periodos cerrados: {', '.join(closed)}")
    if not PerformanceRepository(db).delete(performance_id):
        raise map_repository_error(EntityNotFoundError("Performance not found."))
    return None


@router.post("/level", response_model=LevelResponse, status_code=status.HTTP_201_CREATED)
def create_level(payload: LevelCreate, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    try:
        return LevelRepository(db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/level/{level_id}", response_model=LevelResponse)
def update_level(level_id: str, payload: LevelUpdate, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    try:
        result = LevelRepository(db).update(level_id, payload.model_dump(exclude_unset=True))
        if result is None:
            raise EntityNotFoundError("Level not found.")
        return result
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.delete("/level/{level_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_level(level_id: str, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_CRUD"))):
    level = LevelRepository(db).get_by_id(level_id)
    if not level:
        raise map_repository_error(EntityNotFoundError("Level not found."))
    closed = RubricRepository(db).closed_periods_for_level(level.performance_id, level_id)
    if closed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"No se puede borrar: tiene valoraciones en periodos cerrados: {', '.join(closed)}")
    LevelRepository(db).delete(level_id)
    return None


# ── Programación de SO — SO_SCHEDULE_MANAGE ─────────────────
@router.get("/so-schedule", response_model=list[SoScheduleResponse])
async def list_so_schedule(
    period_id: int | None = None,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_permission("SO_TO_ASSESS_VIEW")),
):
    nrcs = await _teacher_nrcs_or_none(user)
    if nrcs is not None and not nrcs:
        return []
    repo = SoScheduleRepository(db)
    if period_id is not None:
        return repo.list_by_period_scoped(period_id, nrcs)
    return repo.list_all_scoped(nrcs)


@router.get("/so-schedule/current", response_model=list[SoScheduleResponse])
async def list_current_schedule(db: Session = Depends(db_session), user: CurrentUser = Depends(require_permission("SO_TO_ASSESS_VIEW"))):
    nrcs = await _teacher_nrcs_or_none(user)
    if nrcs is not None and not nrcs:
        return []
    return SoScheduleRepository(db).list_current_scoped(nrcs)


@router.post("/so-schedule", response_model=SoScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_so_schedule(
    payload: SoScheduleCreate,
    db: Session = Depends(db_session),
    current_user: CurrentUser = Depends(require_permission("SO_SCHEDULE_MANAGE")),
):
    # cross-service: el periodo debe existir en User_MS.
    try:
        if not await UserMsClient().period_exists(payload.period_id):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El periodo no existe")
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc
    data = payload.model_dump()
    data["coordinator_user_id"] = current_user.user_id
    try:
        return SoScheduleRepository(db).create(data)
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.delete("/so-schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_so_schedule(schedule_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("SO_SCHEDULE_MANAGE"))):
    repo = SoScheduleRepository(db)
    sched = repo.get_by_id(schedule_id)
    if not sched:
        raise map_repository_error(EntityNotFoundError("Schedule not found."))
    if sched.status == "CERRADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"No se puede borrar: tiene valoraciones en periodos cerrados: {sched.period_id}")
    repo.delete(schedule_id)
    return None


@router.get("/so-schedule/{schedule_id}/subjects", response_model=list[int])
def get_schedule_subjects(
    schedule_id: int,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_permission("SO_TO_ASSESS_VIEW")),
):
    """NRC asignados a una programación. Lo usa la UI para precargar el diálogo
    de NRC y para contar cuántos NRC valoran cada SO."""
    repo = SoScheduleRepository(db)
    if not repo.get_by_id(schedule_id):
        raise map_repository_error(EntityNotFoundError("Schedule not found."))
    return repo.nrcs_for_schedule(schedule_id)


@router.put("/so-schedule/{schedule_id}/subjects", response_model=SoScheduleResponse)
async def set_schedule_subjects(
    schedule_id: int,
    payload: ScheduleSubjectsUpdate,
    db: Session = Depends(db_session),
    _: CurrentUser = Depends(require_permission("SO_SCHEDULE_MANAGE")),
):
    repo = SoScheduleRepository(db)
    sched = repo.get_by_id(schedule_id)
    if not sched:
        raise map_repository_error(EntityNotFoundError("Schedule not found."))
    if sched.status == "CERRADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La programación está cerrada")
    # Cada NRC debe existir en User_MS Y pertenecer al MISMO periodo que la
    # programación (paso 13). subject.periods_id y so_schedule.period_id apuntan
    # ambos a users_db.periods.id, así que son comparables directamente.
    client = UserMsClient()
    try:
        for nrc in payload.nrcs:
            period = await client.subject_period(nrc)
            if period is None:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"El NRC {nrc} no existe")
            if period != sched.period_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"El NRC {nrc} no es del periodo de la programación",
                )
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc
    repo.replace_subjects(schedule_id, payload.nrcs)
    return repo.get_by_id(schedule_id)


@router.patch("/so-schedule/{schedule_id}/status", response_model=SoScheduleResponse)
def change_status(
    schedule_id: int,
    payload: ScheduleStatusUpdate,
    db: Session = Depends(db_session),
    current_user: CurrentUser = Depends(require_permission("SO_SCHEDULE_MANAGE")),
):
    from datetime import datetime, timezone
    repo = SoScheduleRepository(db)
    sched = repo.get_by_id(schedule_id)
    if not sched:
        raise map_repository_error(EntityNotFoundError("Schedule not found."))

    allowed = {
        ("PLANIFICADO", "EN_CURSO"),
        ("EN_CURSO", "CERRADO"),
        ("CERRADO", "EN_CURSO"),
        ("EN_CURSO", "PLANIFICADO"),
    }
    transition = (sched.status, payload.status)
    if transition == ("EN_CURSO", "PLANIFICADO") and repo.has_rubrics(schedule_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya hay valoraciones registradas")
    if transition not in allowed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transición de estado no permitida")

    sched.status = payload.status
    sched.updated_by = current_user.user_id
    sched.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sched)
    return sched


# ── SO a valorar en mis NRC — SO_TO_ASSESS_VIEW ─────────────
@router.get("/me/assessments", response_model=list[AssessmentToDoResponse])
async def my_assessments(db: Session = Depends(db_session), current_user: CurrentUser = Depends(require_permission("SO_TO_ASSESS_VIEW"))):
    from sqlalchemy import select
    from app.infrastructure.database.models import ScheduleSubjectModel, SoScheduleModel, StudentOutcomeModel
    try:
        my_nrcs = await UserMsClient().teacher_subjects(current_user.user_id)
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc
    if not my_nrcs:
        return []
    stmt = (
        select(SoScheduleModel.id, SoScheduleModel.so_id, StudentOutcomeModel.description,
               ScheduleSubjectModel.subjects_id, SoScheduleModel.period_id)
        .join(StudentOutcomeModel, StudentOutcomeModel.id == SoScheduleModel.so_id)
        .join(ScheduleSubjectModel, ScheduleSubjectModel.schedule_id == SoScheduleModel.id)
        .where(SoScheduleModel.status == "EN_CURSO", ScheduleSubjectModel.subjects_id.in_(my_nrcs))
    )
    rows = db.execute(stmt).all()
    return [
        AssessmentToDoResponse(schedule_id=r[0], so_id=r[1], description=r[2], nrc=r[3], period_id=r[4])
        for r in rows
    ]


# ── Rúbrica — RUBRIC_FILL / RUBRIC_VIEW ─────────────────────
@router.get("/rubric", response_model=list[RubricResponse])
async def list_rubric(
    period_id: int | None = None,
    db: Session = Depends(db_session),
    user: CurrentUser = Depends(require_permission("RUBRIC_VIEW")),
):
    nrcs = await _teacher_nrcs_or_none(user)
    if nrcs is not None and not nrcs:
        return []
    repo = RubricRepository(db)
    if period_id is not None:
        return repo.list_by_period(period_id, nrcs)
    return repo.list_scoped(nrcs)


@router.post("/rubric", response_model=RubricResponse, status_code=status.HTTP_201_CREATED)
async def create_rubric(
    payload: RubricCreate,
    db: Session = Depends(db_session),
    current_user: CurrentUser = Depends(require_permission("RUBRIC_FILL")),
):
    sched = SoScheduleRepository(db).get_by_id(payload.schedule_id)
    # 1. schedule existe y EN_CURSO
    if not sched:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La programación no existe")
    if sched.status == "PLANIFICADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese student outcome aún no se ha abierto para valoración")
    if sched.status == "CERRADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese periodo ya fue cerrado. Pídele al coordinador que lo reabra")
    # 2. NRC asignado a esa programación
    if payload.subjects_id not in SoScheduleRepository(db).nrcs_for_schedule(payload.schedule_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese curso no valora este student outcome en este periodo")
    # 4 y 5: cross-service (el 3 es implícito: evaluator = token)
    client = UserMsClient()
    try:
        if not await client.teacher_has_subject(current_user.user_id, payload.subjects_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ese curso no está asignado a usted")
        if not await client.student_enrolled(payload.student_id, payload.subjects_id):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El estudiante no está matriculado en ese curso")
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc
    # 6. performance pertenece al SO de la programación
    perf = PerformanceRepository(db).get_by_id(payload.performance_id)
    if not perf or perf.so_id != sched.so_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Ese indicador no es de este student outcome")
    # 7. guardar (uq_rubric / fk_rubric_evidence los valida la BD)
    data = payload.model_dump()
    data["evaluator_user_id"] = current_user.user_id
    try:
        return RubricRepository(db).create(data)
    except InvalidReferenceError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya valoraste a este estudiante en este indicador") from exc


@router.put("/rubric/{rubric_id}", response_model=RubricResponse)
def update_rubric(
    rubric_id: int,
    payload: RubricUpdate,
    db: Session = Depends(db_session),
    current_user: CurrentUser = Depends(require_permission("RUBRIC_FILL")),
):
    repo = RubricRepository(db)
    rubric = repo.get_by_id(rubric_id)
    if not rubric:
        raise map_repository_error(EntityNotFoundError("Rubric not found."))
    if rubric.evaluator_user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puede corregir valoraciones de otro evaluador")
    sched = SoScheduleRepository(db).get_by_id(rubric.schedule_id)
    if sched and sched.status == "CERRADO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese periodo ya fue cerrado")
    try:
        return repo.update(rubric_id, payload.model_dump(exclude_unset=True))
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


# ── Evidencia (futura) — EVIDENCE_UPLOAD ────────────────────
@router.post("/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def create_evidence(
    payload: EvidenceCreate,
    db: Session = Depends(db_session),
    current_user: CurrentUser = Depends(require_permission("EVIDENCE_UPLOAD")),
):
    sched = SoScheduleRepository(db).get_by_id(payload.schedule_id)
    if not sched or sched.status != "EN_CURSO":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La programación no está en curso")
    if payload.subjects_id not in SoScheduleRepository(db).nrcs_for_schedule(payload.schedule_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese curso no valora este student outcome en este periodo")
    client = UserMsClient()
    try:
        if not await client.teacher_has_subject(current_user.user_id, payload.subjects_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ese curso no está asignado a usted")
        if not await client.student_enrolled(payload.student_id, payload.subjects_id):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El estudiante no está matriculado en ese curso")
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc
    data = payload.model_dump()
    data["uploaded_by"] = current_user.user_id
    try:
        return EvidenceRepository(db).create(data)
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc
