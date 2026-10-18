import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.services.password_policy import PasswordPolicyError, validate_new_password
from app.infrastructure.repositories.sqlalchemy_repositories import TeacherSubjectRepository, UserRepository
from app.infrastructure.security.password_service import hash_password, verify_password
from app.interfaces.api.v1.dependencies import db_session, get_current_user, require_permission
from app.interfaces.api.v1.schemas import PasswordChange, SubjectResponse

audit = logging.getLogger("mesoftx.audit")

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


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(
    payload: PasswordChange,
    db: Session = Depends(db_session),
    current_user=Depends(get_current_user),
):
    """El usuario cambia su propia contraseña (derecho de actualización, Ley 1581)."""
    if not current_user.password or not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La contraseña actual no es correcta.")
    try:
        validate_new_password(payload.new_password, current=payload.current_password)
    except PasswordPolicyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    UserRepository(db).update_user(current_user.id, {"password": hash_password(payload.new_password)})
    audit.info("PASSWORD_CHANGED user=%s", current_user.id)
