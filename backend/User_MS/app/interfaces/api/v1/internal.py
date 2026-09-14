from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.repositories.sqlalchemy_repositories import (
    EnrollmentRepository,
    PeriodRepository,
    StudentRepository,
    SubjectRepository,
    TeacherSubjectRepository,
    UserRepository,
)
from app.interfaces.api.v1.dependencies import db_session, require_service_token
from app.interfaces.api.v1.schemas import StudentResponse, SubjectsCountRequest

# Todos los endpoints internos exigen el token de servicio (paso 12).
router = APIRouter(tags=["Internal"], dependencies=[Depends(require_service_token)])


@router.get("/students/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(db_session)):
    student = StudentRepository(db).get_by_id(student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student


# Existencia de referencias cross-service (las consulta Assesment_MS, paso 12).
@router.get("/internal/users/{user_id}")
def user_exists(user_id: int, db: Session = Depends(db_session)):
    if not UserRepository(db).get_by_id(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return {"exists": True}


@router.get("/internal/subjects/{nrc}")
def subject_exists(nrc: int, db: Session = Depends(db_session)):
    subject = SubjectRepository(db).get_by_id(nrc)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    return {"exists": True, "periods_id": subject.periods_id}


@router.get("/internal/periods/{period_id}")
def period_exists(period_id: int, db: Session = Depends(db_session)):
    if not PeriodRepository(db).get_by_id(period_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Period not found.")
    return {"exists": True}


@router.get("/subjects/{nrc}/students/{student_id}")
def is_enrolled(nrc: int, student_id: int, db: Session = Depends(db_session)):
    if not EnrollmentRepository(db).is_enrolled(student_id, nrc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not enrolled.")
    return {"enrolled": True}


@router.get("/teacher-subjects/{user_id}/{nrc}")
def teacher_has_subject(user_id: int, nrc: int, db: Session = Depends(db_session)):
    if not TeacherSubjectRepository(db).has_subject(user_id, nrc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not assigned.")
    return {"assigned": True}


@router.get("/internal/teacher-subjects")
def teacher_subjects(user_id: int, db: Session = Depends(db_session)) -> list[int]:
    return TeacherSubjectRepository(db).nrcs_for_user(user_id)


@router.post("/internal/subjects/students/count")
def subjects_students_count(payload: SubjectsCountRequest, db: Session = Depends(db_session)) -> dict[int, int]:
    return EnrollmentRepository(db).counts_for_nrcs(payload.nrcs)
