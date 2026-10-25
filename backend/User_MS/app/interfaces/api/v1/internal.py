from app.application.use_cases import internal as use_cases
from app.infrastructure.composition import build_context
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.interfaces.api.v1.dependencies import db_session, require_service_token
from app.interfaces.api.v1.schemas import StudentResponse, SubjectsCountRequest
router = APIRouter(tags=['Internal'], dependencies=[Depends(require_service_token)])

@router.get('/students/{student_id}', response_model=StudentResponse)
def get_student(student_id: int, db: Session=Depends(db_session)):
    return use_cases.get_student(student_id=student_id, context=build_context(db))

@router.get('/internal/users/{user_id}')
def user_exists(user_id: int, db: Session=Depends(db_session)):
    return use_cases.user_exists(user_id=user_id, context=build_context(db))

@router.get('/internal/subjects/{nrc}')
def subject_exists(nrc: int, db: Session=Depends(db_session)):
    return use_cases.subject_exists(nrc=nrc, context=build_context(db))

@router.get('/internal/periods/{period_id}')
def period_exists(period_id: int, db: Session=Depends(db_session)):
    return use_cases.period_exists(period_id=period_id, context=build_context(db))

@router.get('/subjects/{nrc}/students/{student_id}')
def is_enrolled(nrc: int, student_id: int, db: Session=Depends(db_session)):
    return use_cases.is_enrolled(nrc=nrc, student_id=student_id, context=build_context(db))

@router.get('/teacher-subjects/{user_id}/{nrc}')
def teacher_has_subject(user_id: int, nrc: int, db: Session=Depends(db_session)):
    return use_cases.teacher_has_subject(user_id=user_id, nrc=nrc, context=build_context(db))

@router.get('/internal/teacher-subjects')
def teacher_subjects(user_id: int, db: Session=Depends(db_session)) -> list[int]:
    return use_cases.teacher_subjects(user_id=user_id, context=build_context(db))

@router.post('/internal/subjects/students/count')
def subjects_students_count(payload: SubjectsCountRequest, db: Session=Depends(db_session)) -> dict[int, int]:
    return use_cases.subjects_students_count(payload=payload, context=build_context(db))

@router.post('/internal/subjects/teachers')
def subjects_teachers(payload: SubjectsCountRequest, db: Session=Depends(db_session)) -> dict[int, list[int]]:
    """nrc -> [user_id, ...] de los profesores que lo dictan. Batch para el
    dashboard de avance por profesor (Assesment_MS)."""
    return use_cases.subjects_teachers(payload=payload, context=build_context(db))

@router.post('/internal/subjects/programs')
def subjects_programs(payload: SubjectsCountRequest, db: Session=Depends(db_session)) -> dict[int, str]:
    """nrc -> program_id. Batch para el dashboard de avance por programa."""
    return use_cases.subjects_programs(payload=payload, context=build_context(db))
