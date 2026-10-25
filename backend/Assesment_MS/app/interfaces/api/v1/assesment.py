from app.application.use_cases import assesment as use_cases
from app.infrastructure.composition import build_context
from typing import Any
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.interfaces.api.v1.dependencies import CurrentUser, db_session, get_current_user, require_any_permission, require_permission
from app.interfaces.api.v1.schemas import AssessmentToDoResponse, EvidenceCreate, EvidenceResponse, LevelCreate, LevelResponse, LevelUpdate, PerformanceCreate, PerformanceResponse, PerformanceUpdate, PeriodTargetResponse, PeriodTargetUpdate, RubricCreate, RubricResponse, RubricUpdate, ScheduleStatusUpdate, ScheduleSubjectsUpdate, SoScheduleCreate, SoScheduleResponse, StudentOutcomeCreate, StudentOutcomeResponse, StudentOutcomeUpdate
router = APIRouter(tags=['Assesment'])

@router.get('/so', response_model=list[StudentOutcomeResponse])
def list_so(db: Session=Depends(db_session), _: CurrentUser=Depends(require_any_permission('SO_CRUD', 'INDICATOR_VIEW', 'RUBRIC_VIEW', 'SO_TO_ASSESS_VIEW'))):
    return use_cases.list_so(context=build_context(db), _=_)

@router.post('/so', response_model=StudentOutcomeResponse, status_code=status.HTTP_201_CREATED)
def create_so(payload: StudentOutcomeCreate, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.create_so(payload=payload, context=build_context(db), _=_)

@router.put('/so/{so_id}', response_model=StudentOutcomeResponse)
def update_so(so_id: str, payload: StudentOutcomeUpdate, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.update_so(so_id=so_id, payload=payload, context=build_context(db), _=_)

@router.delete('/so/{so_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_so(so_id: str, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.delete_so(so_id=so_id, context=build_context(db), _=_)

@router.get('/performance', response_model=list[PerformanceResponse])
def list_performance(so_id: str, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('INDICATOR_VIEW'))):
    return use_cases.list_performance(so_id=so_id, context=build_context(db), _=_)

@router.get('/performance/{performance_id}/levels', response_model=list[LevelResponse])
def list_levels(performance_id: str, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('INDICATOR_VIEW'))):
    return use_cases.list_levels(performance_id=performance_id, context=build_context(db), _=_)

@router.post('/performance', response_model=PerformanceResponse, status_code=status.HTTP_201_CREATED)
def create_performance(payload: PerformanceCreate, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.create_performance(payload=payload, context=build_context(db), _=_)

@router.put('/performance/{performance_id}', response_model=PerformanceResponse)
def update_performance(performance_id: str, payload: PerformanceUpdate, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.update_performance(performance_id=performance_id, payload=payload, context=build_context(db), _=_)

@router.delete('/performance/{performance_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_performance(performance_id: str, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.delete_performance(performance_id=performance_id, context=build_context(db), _=_)

@router.post('/level', response_model=LevelResponse, status_code=status.HTTP_201_CREATED)
def create_level(payload: LevelCreate, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.create_level(payload=payload, context=build_context(db), _=_)

@router.put('/level/{level_id}', response_model=LevelResponse)
def update_level(level_id: str, payload: LevelUpdate, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.update_level(level_id=level_id, payload=payload, context=build_context(db), _=_)

@router.delete('/level/{level_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_level(level_id: str, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_CRUD'))):
    return use_cases.delete_level(level_id=level_id, context=build_context(db), _=_)

@router.get('/so-schedule', response_model=list[SoScheduleResponse])
async def list_so_schedule(period_id: int | None=None, db: Session=Depends(db_session), user: CurrentUser=Depends(require_permission('SO_TO_ASSESS_VIEW'))):
    return await use_cases.list_so_schedule(period_id=period_id, context=build_context(db), user=user)

@router.get('/so-schedule/current', response_model=list[SoScheduleResponse])
async def list_current_schedule(db: Session=Depends(db_session), user: CurrentUser=Depends(require_permission('SO_TO_ASSESS_VIEW'))):
    return await use_cases.list_current_schedule(context=build_context(db), user=user)

@router.post('/so-schedule', response_model=SoScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_so_schedule(payload: SoScheduleCreate, db: Session=Depends(db_session), current_user: CurrentUser=Depends(require_permission('SO_SCHEDULE_MANAGE'))):
    return await use_cases.create_so_schedule(payload=payload, context=build_context(db), current_user=current_user)

@router.delete('/so-schedule/{schedule_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_so_schedule(schedule_id: int, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_SCHEDULE_MANAGE'))):
    return use_cases.delete_so_schedule(schedule_id=schedule_id, context=build_context(db), _=_)

@router.get('/so-schedule/{schedule_id}/subjects', response_model=list[int])
def get_schedule_subjects(schedule_id: int, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_TO_ASSESS_VIEW'))):
    """NRC asignados a una programación. Lo usa la UI para precargar el diálogo
    de NRC y para contar cuántos NRC valoran cada SO."""
    return use_cases.get_schedule_subjects(schedule_id=schedule_id, context=build_context(db), _=_)

@router.put('/so-schedule/{schedule_id}/subjects', response_model=SoScheduleResponse)
async def set_schedule_subjects(schedule_id: int, payload: ScheduleSubjectsUpdate, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_SCHEDULE_MANAGE'))):
    return await use_cases.set_schedule_subjects(schedule_id=schedule_id, payload=payload, context=build_context(db), _=_)

@router.patch('/so-schedule/{schedule_id}/status', response_model=SoScheduleResponse)
def change_status(schedule_id: int, payload: ScheduleStatusUpdate, db: Session=Depends(db_session), current_user: CurrentUser=Depends(require_permission('SO_SCHEDULE_MANAGE'))):
    return use_cases.change_status(schedule_id=schedule_id, payload=payload, context=build_context(db), current_user=current_user)

@router.get('/period-target/{period_id}', response_model=PeriodTargetResponse)
def get_period_target(period_id: int, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('SO_SCHEDULE_MANAGE'))):
    """Devuelve la meta de logro configurada para el periodo. 404 si no existe."""
    return use_cases.get_period_target(period_id=period_id, context=build_context(db), _=_)

@router.put('/period-target/{period_id}', response_model=PeriodTargetResponse)
async def set_period_target(period_id: int, payload: PeriodTargetUpdate, db: Session=Depends(db_session), current_user: CurrentUser=Depends(require_permission('SO_SCHEDULE_MANAGE'))):
    """Fija o actualiza la meta de logro del periodo. Rechaza el cambio si el
    periodo ya tiene programaciones cerradas, para no alterar el histórico."""
    return await use_cases.set_period_target(period_id=period_id, payload=payload, context=build_context(db), current_user=current_user)

@router.get('/me/assessments', response_model=list[AssessmentToDoResponse])
async def my_assessments(db: Session=Depends(db_session), current_user: CurrentUser=Depends(require_permission('SO_TO_ASSESS_VIEW'))):
    return await use_cases.my_assessments(context=build_context(db), current_user=current_user)

@router.get('/rubric', response_model=list[RubricResponse])
async def list_rubric(period_id: int | None=None, schedule_id: int | None=None, subjects_id: int | None=None, student_id: int | None=None, db: Session=Depends(db_session), user: CurrentUser=Depends(require_permission('RUBRIC_VIEW'))):
    return await use_cases.list_rubric(period_id=period_id, schedule_id=schedule_id, subjects_id=subjects_id, student_id=student_id, context=build_context(db), user=user)

@router.post('/rubric', response_model=RubricResponse, status_code=status.HTTP_201_CREATED)
async def create_rubric(payload: RubricCreate, db: Session=Depends(db_session), current_user: CurrentUser=Depends(require_permission('RUBRIC_FILL'))):
    return await use_cases.create_rubric(payload=payload, context=build_context(db), current_user=current_user)

@router.put('/rubric/{rubric_id}', response_model=RubricResponse)
def update_rubric(rubric_id: int, payload: RubricUpdate, db: Session=Depends(db_session), current_user: CurrentUser=Depends(require_permission('RUBRIC_FILL'))):
    return use_cases.update_rubric(rubric_id=rubric_id, payload=payload, context=build_context(db), current_user=current_user)

@router.post('/evidence', response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def create_evidence(payload: EvidenceCreate, db: Session=Depends(db_session), current_user: CurrentUser=Depends(require_permission('EVIDENCE_UPLOAD'))):
    return await use_cases.create_evidence(payload=payload, context=build_context(db), current_user=current_user)
