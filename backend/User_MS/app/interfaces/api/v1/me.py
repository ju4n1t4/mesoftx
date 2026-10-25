from app.application.use_cases import me as use_cases
from app.infrastructure.composition import build_context
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.interfaces.api.v1.dependencies import db_session, get_current_user, require_permission
from app.interfaces.api.v1.schemas import PasswordChange, SubjectResponse
router = APIRouter(prefix='/me', tags=['Me'])

@router.get('/subjects', response_model=list[SubjectResponse])
def my_subjects(db: Session=Depends(db_session), current_user=Depends(require_permission('MY_COURSES_VIEW'))):
    return use_cases.my_subjects(context=build_context(db), current_user=current_user)

@router.get('/subjects/pending', response_model=list[SubjectResponse])
def my_pending_subjects(db: Session=Depends(db_session), current_user=Depends(require_permission('MY_COURSES_VIEW'))):
    """NRC asignados a los que aún no se les cargó ningún estudiante (paso 13)."""
    return use_cases.my_pending_subjects(context=build_context(db), current_user=current_user)

@router.post('/password', status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(payload: PasswordChange, db: Session=Depends(db_session), current_user=Depends(get_current_user)):
    """El usuario cambia su propia contraseña (derecho de actualización, Ley 1581)."""
    return use_cases.change_my_password(payload=payload, context=build_context(db), current_user=current_user)
