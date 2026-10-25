from app.application.use_cases import students as use_cases
from app.infrastructure.composition import build_context
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.interfaces.api.v1.dependencies import Scope, db_session, require_permission, scope_filter
from app.interfaces.api.v1.schemas import StudentResponse, StudentUpdate, StudentUploadRequest, StudentUploadResult
router = APIRouter(tags=['Students'])

@router.post('/subjects/{nrc}/students', response_model=StudentUploadResult, status_code=status.HTTP_201_CREATED)
def upload_students(nrc: int, payload: StudentUploadRequest, db: Session=Depends(db_session), current_user=Depends(require_permission('STUDENT_UPLOAD'))):
    """Carga la lista del curso. Deduplica por document_number; el primero que
    lo cargó gana (paso 13)."""
    return use_cases.upload_students(nrc=nrc, payload=payload, context=build_context(db), current_user=current_user)

@router.get('/subjects/{nrc}/students', response_model=list[StudentResponse])
def list_subject_students(nrc: int, db: Session=Depends(db_session), scope: Scope=Depends(scope_filter)):
    return use_cases.list_subject_students(nrc=nrc, context=build_context(db), scope=scope)

@router.get('/students', response_model=list[StudentResponse])
def search_students(document: str | None=None, name: str | None=None, db: Session=Depends(db_session), _=Depends(require_permission('TEACHER_CRUD'))):
    return use_cases.search_students(document=document, name=name, context=build_context(db), _=_)

@router.put('/students/{student_id}', response_model=StudentResponse)
def update_student(student_id: int, payload: StudentUpdate, db: Session=Depends(db_session), _=Depends(require_permission('TEACHER_CRUD'))):
    """Solo el coordinador. Puede cambiar name y program_id, nunca document_number."""
    return use_cases.update_student(student_id=student_id, payload=payload, context=build_context(db), _=_)

@router.delete('/students/{student_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(student_id: int, db: Session=Depends(db_session), _=Depends(require_permission('TEACHER_CRUD'))):
    """Borra un estudiante. Antes borra en Assesment_MS sus rúbricas y evidencias;
    409 si hay periodos cerrados; 503 si el servicio no responde (paso 12)."""
    return await use_cases.delete_student(student_id=student_id, context=build_context(db), _=_)
