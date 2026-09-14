from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infrastructure.repositories.sqlalchemy_repositories import TeacherSubjectRepository
from app.interfaces.api.v1.dependencies import db_session, require_permission
from app.interfaces.api.v1.schemas import SubjectResponse

router = APIRouter(prefix="/me", tags=["Me"])


@router.get("/subjects", response_model=list[SubjectResponse])
def my_subjects(
    db: Session = Depends(db_session),
    current_user=Depends(require_permission("MY_COURSES_VIEW")),
):
    return TeacherSubjectRepository(db).subjects_for_user(current_user.id)


@router.get("/subjects/pending", response_model=list[SubjectResponse])
def my_pending_subjects(
    db: Session = Depends(db_session),
    current_user=Depends(require_permission("MY_COURSES_VIEW")),
):
    """NRC asignados a los que aún no se les cargó ningún estudiante (paso 13)."""
    return TeacherSubjectRepository(db).pending_subjects_for_user(current_user.id)
