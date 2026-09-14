from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database.models import RubricModel, SoScheduleModel, StudentOutcomeModel
from app.infrastructure.repositories.sqlalchemy_repositories import (
    RubricRepository,
    ScheduleSubjectRepository,
    SoScheduleRepository,
    StudentOutcomeRepository,
)
from app.interfaces.api.v1.dependencies import db_session, require_service_token

# Todos los endpoints internos exigen el token de servicio (paso 12).
router = APIRouter(prefix="/internal", tags=["Internal"], dependencies=[Depends(require_service_token)])


def _conflict(closed: list[str]) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "detail": f"No se puede borrar: tiene valoraciones en periodos cerrados: {', '.join(closed)}",
            "closed_periods": closed,
        },
    )


@router.delete("/rubric")
def delete_rubric(
    evaluator_user_id: int | None = None,
    subjects_id: int | None = None,
    student_id: int | None = None,
    db: Session = Depends(db_session),
):
    """Borra rúbricas Y evidencias del id dado. Idempotente: si no hay nada,
    devuelve {"deleted": 0} con 200 (no 404). 409 si toca periodos cerrados."""
    filters = {k: v for k, v in (
        ("evaluator_user_id", evaluator_user_id),
        ("subjects_id", subjects_id),
        ("student_id", student_id),
    ) if v is not None}
    if not filters:
        return {"deleted": 0}

    repo = RubricRepository(db)
    closed = repo.closed_periods_by_filter(**filters)
    if closed:
        return _conflict(closed)

    deleted = repo.delete_by_filter(**filters)
    repo.delete_evidence_by_filter(**filters)
    repo.commit()
    return {"deleted": deleted}


@router.delete("/schedule-subjects")
def delete_schedule_subjects(subjects_id: int, db: Session = Depends(db_session)):
    deleted = ScheduleSubjectRepository(db).delete_by_subject(subjects_id)
    return {"deleted": deleted}


@router.delete("/so-schedule")
def delete_so_schedule_by_period(period_id: int, db: Session = Depends(db_session)):
    # 409 si alguna programación de ese periodo está CERRADO.
    closed = db.scalars(
        select(SoScheduleModel.period_id)
        .where(SoScheduleModel.period_id == period_id, SoScheduleModel.status == "CERRADO")
        .distinct()
    ).all()
    if closed:
        return _conflict([str(p) for p in closed])
    schedules = SoScheduleRepository(db).list_by_period(period_id)
    for sched in schedules:
        db.delete(sched)
    db.commit()
    return {"deleted": len(schedules)}


@router.delete("/so")
def delete_so_by_college(college_id: str, db: Session = Depends(db_session)):
    # 409 si hay rúbricas cerradas colgando de los SO de esa facultad.
    closed = db.scalars(
        select(SoScheduleModel.period_id)
        .join(RubricModel, RubricModel.schedule_id == SoScheduleModel.id)
        .join(StudentOutcomeModel, StudentOutcomeModel.id == SoScheduleModel.so_id)
        .where(StudentOutcomeModel.college_id == college_id, SoScheduleModel.status == "CERRADO")
        .distinct()
    ).all()
    if closed:
        return _conflict([str(p) for p in closed])
    repo = StudentOutcomeRepository(db)
    sos = repo.list_by_college(college_id)
    for so in sos:
        db.delete(so)
    db.commit()
    return {"deleted": len(sos)}
