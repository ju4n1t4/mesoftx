"""Application use cases extracted from HTTP; adapters are supplied through ports."""
from typing import Any
from app.application.ports.context import ApplicationContext
from app.application.ports.errors import ApplicationError, RemoteServiceError, EntityNotFoundError, EntityAlreadyExistsError, InvalidReferenceError
from app.application.dto import *

def _conflict(closed: list[str]) -> Any:
    raise ApplicationError('conflict', f'No se puede borrar: tiene valoraciones en periodos cerrados: {', '.join(closed)}', {'closed_periods': closed})

def delete_rubric(evaluator_user_id: int | None=None, subjects_id: int | None=None, student_id: int | None=None, context: ApplicationContext=None):
    """Borra rúbricas Y evidencias del id dado. Idempotente: si no hay nada,
    devuelve {"deleted": 0} con 200 (no 404). 409 si toca periodos cerrados."""
    filters = {k: v for k, v in (('evaluator_user_id', evaluator_user_id), ('subjects_id', subjects_id), ('student_id', student_id)) if v is not None}
    if not filters:
        return {'deleted': 0}
    repo = context.repositories.rubric
    closed = repo.closed_periods_by_filter(**filters)
    if closed:
        return _conflict(closed)
    deleted = repo.delete_by_filter(**filters)
    repo.delete_evidence_by_filter(**filters)
    repo.commit()
    return {'deleted': deleted}

def delete_schedule_subjects(subjects_id: int, context: ApplicationContext=None):
    deleted = context.repositories.schedule_subject.delete_by_subject(subjects_id)
    return {'deleted': deleted}

def delete_so_schedule_by_period(period_id: int, context: ApplicationContext=None):
    repo = context.repositories.so_schedule
    closed = repo.closed_periods_for_period(period_id)
    if closed:
        return _conflict(closed)
    schedules = repo.list_by_period(period_id)
    repo.delete_many(schedules)
    return {'deleted': len(schedules)}

def delete_so_by_college(college_id: str, context: ApplicationContext=None):
    closed = context.repositories.so_schedule.closed_periods_for_college(college_id)
    if closed:
        return _conflict(closed)
    repo = context.repositories.student_outcome
    sos = repo.list_by_college(college_id)
    repo.delete_many(sos)
    return {'deleted': len(sos)}
