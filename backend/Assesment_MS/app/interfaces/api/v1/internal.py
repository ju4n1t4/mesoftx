from app.application.use_cases import internal as use_cases
from app.infrastructure.composition import build_context
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.interfaces.api.v1.dependencies import db_session, require_service_token
router = APIRouter(prefix='/internal', tags=['Internal'], dependencies=[Depends(require_service_token)])

@router.delete('/rubric')
def delete_rubric(evaluator_user_id: int | None=None, subjects_id: int | None=None, student_id: int | None=None, db: Session=Depends(db_session)):
    """Borra rúbricas Y evidencias del id dado. Idempotente: si no hay nada,
    devuelve {"deleted": 0} con 200 (no 404). 409 si toca periodos cerrados."""
    return use_cases.delete_rubric(evaluator_user_id=evaluator_user_id, subjects_id=subjects_id, student_id=student_id, context=build_context(db))

@router.delete('/schedule-subjects')
def delete_schedule_subjects(subjects_id: int, db: Session=Depends(db_session)):
    return use_cases.delete_schedule_subjects(subjects_id=subjects_id, context=build_context(db))

@router.delete('/so-schedule')
def delete_so_schedule_by_period(period_id: int, db: Session=Depends(db_session)):
    return use_cases.delete_so_schedule_by_period(period_id=period_id, context=build_context(db))

@router.delete('/so')
def delete_so_by_college(college_id: str, db: Session=Depends(db_session)):
    return use_cases.delete_so_by_college(college_id=college_id, context=build_context(db))
