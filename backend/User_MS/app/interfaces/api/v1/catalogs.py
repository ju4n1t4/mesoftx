from app.application.use_cases import catalogs as use_cases
from app.infrastructure.composition import build_context
from typing import Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.interfaces.api.v1.dependencies import db_session, get_current_user, require_any_permission, require_permission
from app.interfaces.api.v1.schemas import CollegeCreate, CollegeResponse, CollegeUpdate, PeriodCreate, PeriodResponse, PeriodUpdate, PermissionResponse, ProgramCreate, ProgramResponse, ProgramUpdate, RoleCreate, RolePermissionsUpdate, RoleResponse, RoleUpdate, SubjectCreate, SubjectResponse, SubjectUpdate, TeacherSubjectCreate, TeacherSubjectDetail, TeacherSubjectResponse
router = APIRouter(tags=['Catalogs'], dependencies=[Depends(get_current_user)])

@router.get('/roles', response_model=list[RoleResponse])
def list_roles(db: Session=Depends(db_session), current_user=Depends(get_current_user)):
    return use_cases.list_roles(context=build_context(db), current_user=current_user)

@router.post('/roles', response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleCreate, db: Session=Depends(db_session), _=Depends(require_permission('USER_CRUD'))):
    return use_cases.create_role(payload=payload, context=build_context(db), _=_)

@router.put('/roles/{entity_id}', response_model=RoleResponse)
def update_role(entity_id: int, payload: RoleUpdate, db: Session=Depends(db_session), _=Depends(require_permission('USER_CRUD'))):
    return use_cases.update_role(entity_id=entity_id, payload=payload, context=build_context(db), _=_)

@router.delete('/roles/{entity_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_role(entity_id: int, db: Session=Depends(db_session), _=Depends(require_permission('USER_CRUD'))):
    return use_cases.delete_role(entity_id=entity_id, context=build_context(db), _=_)

@router.get('/permissions', response_model=list[PermissionResponse])
def list_permissions(db: Session=Depends(db_session), _=Depends(require_permission('USER_CRUD'))):
    return use_cases.list_permissions(context=build_context(db), _=_)

@router.get('/roles/{entity_id}/permissions', response_model=list[str])
def get_role_permissions(entity_id: int, db: Session=Depends(db_session), _=Depends(require_permission('USER_CRUD'))):
    return use_cases.get_role_permissions(entity_id=entity_id, context=build_context(db), _=_)

@router.put('/roles/{entity_id}/permissions', response_model=RoleResponse)
def set_role_permissions(entity_id: int, payload: RolePermissionsUpdate, db: Session=Depends(db_session), _=Depends(require_permission('PERMISSION_ASSIGN'))):
    return use_cases.set_role_permissions(entity_id=entity_id, payload=payload, context=build_context(db), _=_)

@router.get('/colleges', response_model=list[CollegeResponse])
def list_colleges(db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.list_colleges(context=build_context(db), _=_)

@router.get('/colleges/{entity_id}', response_model=CollegeResponse)
def get_college(entity_id: str, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.get_college(entity_id=entity_id, context=build_context(db), _=_)

@router.post('/colleges', response_model=CollegeResponse, status_code=status.HTTP_201_CREATED)
def create_college(payload: CollegeCreate, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.create_college(payload=payload, context=build_context(db), _=_)

@router.put('/colleges/{entity_id}', response_model=CollegeResponse)
def update_college(entity_id: str, payload: CollegeUpdate, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.update_college(entity_id=entity_id, payload=payload, context=build_context(db), _=_)

@router.delete('/colleges/{entity_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_college(entity_id: str, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.delete_college(entity_id=entity_id, context=build_context(db), _=_)

@router.get('/programs', response_model=list[ProgramResponse])
def list_programs(db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.list_programs(context=build_context(db), _=_)

@router.get('/programs/{entity_id}', response_model=ProgramResponse)
def get_program(entity_id: str, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.get_program(entity_id=entity_id, context=build_context(db), _=_)

@router.post('/programs', response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(payload: ProgramCreate, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.create_program(payload=payload, context=build_context(db), _=_)

@router.put('/programs/{entity_id}', response_model=ProgramResponse)
def update_program(entity_id: str, payload: ProgramUpdate, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.update_program(entity_id=entity_id, payload=payload, context=build_context(db), _=_)

@router.delete('/programs/{entity_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_program(entity_id: str, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.delete_program(entity_id=entity_id, context=build_context(db), _=_)

@router.get('/periods', response_model=list[PeriodResponse])
def list_periods(db: Session=Depends(db_session), _=Depends(require_any_permission('PROGRAM_CRUD', 'INDICATOR_VIEW', 'INDICATOR_CHART', 'RUBRIC_VIEW', 'DASHBOARD_PROGRAM', 'SO_TO_ASSESS_VIEW'))):
    return use_cases.list_periods(context=build_context(db), _=_)

@router.get('/periods/{entity_id}', response_model=PeriodResponse)
def get_period(entity_id: int, db: Session=Depends(db_session), _=Depends(require_any_permission('PROGRAM_CRUD', 'INDICATOR_VIEW', 'INDICATOR_CHART', 'RUBRIC_VIEW', 'DASHBOARD_PROGRAM', 'SO_TO_ASSESS_VIEW'))):
    return use_cases.get_period(entity_id=entity_id, context=build_context(db), _=_)

@router.post('/periods', response_model=PeriodResponse, status_code=status.HTTP_201_CREATED)
def create_period(payload: PeriodCreate, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.create_period(payload=payload, context=build_context(db), _=_)

@router.put('/periods/{entity_id}', response_model=PeriodResponse)
def update_period(entity_id: int, payload: PeriodUpdate, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.update_period(entity_id=entity_id, payload=payload, context=build_context(db), _=_)

@router.delete('/periods/{entity_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_period(entity_id: int, db: Session=Depends(db_session), _=Depends(require_permission('PROGRAM_CRUD'))):
    return use_cases.delete_period(entity_id=entity_id, context=build_context(db), _=_)

@router.get('/subjects', response_model=list[SubjectResponse])
def list_subjects(db: Session=Depends(db_session), _=Depends(require_permission('SUBJECT_CRUD'))):
    return use_cases.list_subjects(context=build_context(db), _=_)

@router.get('/subjects/{nrc}', response_model=SubjectResponse)
def get_subject(nrc: int, db: Session=Depends(db_session), _=Depends(require_permission('SUBJECT_CRUD'))):
    return use_cases.get_subject(nrc=nrc, context=build_context(db), _=_)

@router.post('/subjects', response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(payload: SubjectCreate, db: Session=Depends(db_session), _=Depends(require_permission('SUBJECT_CRUD'))):
    return use_cases.create_subject(payload=payload, context=build_context(db), _=_)

@router.put('/subjects/{nrc}', response_model=SubjectResponse)
def update_subject(nrc: int, payload: SubjectUpdate, db: Session=Depends(db_session), _=Depends(require_permission('SUBJECT_CRUD'))):
    return use_cases.update_subject(nrc=nrc, payload=payload, context=build_context(db), _=_)

@router.delete('/subjects/{nrc}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(nrc: int, db: Session=Depends(db_session), _=Depends(require_permission('SUBJECT_CRUD'))):
    """Borra una materia (NRC). Antes borra en Assesment_MS sus rúbricas/evidencias
    y sus schedule_subjects; 409 si hay periodos cerrados; 503 si no responde."""
    return await use_cases.delete_subject(nrc=nrc, context=build_context(db), _=_)

@router.post('/teacher-subjects', response_model=TeacherSubjectResponse, status_code=status.HTTP_201_CREATED)
def assign_teacher_subject(payload: TeacherSubjectCreate, db: Session=Depends(db_session), current_user=Depends(require_permission('SUBJECT_CRUD'))):
    return use_cases.assign_teacher_subject(payload=payload, context=build_context(db), current_user=current_user)

@router.get('/teacher-subjects', response_model=list[TeacherSubjectDetail])
def list_teacher_subjects(user_id: int, db: Session=Depends(db_session), _=Depends(require_permission('SUBJECT_CRUD'))):
    """Asignaciones de un profesor: id de la asignación + datos de la materia,
    para listar y poder borrar por id (CRUD de la asignación)."""
    return use_cases.list_teacher_subjects(user_id=user_id, context=build_context(db), _=_)

@router.delete('/teacher-subjects/{assignment_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher_subject(assignment_id: int, db: Session=Depends(db_session), _=Depends(require_permission('SUBJECT_CRUD'))):
    """Quita una asignación NRC-profesor. Borrado local (fila en teacher_subjects);
    no afecta al profesor ni a la materia, así que no hay borrado cruzado."""
    return use_cases.delete_teacher_subject(assignment_id=assignment_id, context=build_context(db), _=_)
