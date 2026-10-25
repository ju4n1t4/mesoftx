from app.application.use_cases import dashboards as use_cases
from app.infrastructure.composition import build_context
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.interfaces.api.v1.dependencies import CurrentUser, db_session, require_permission
from app.interfaces.api.v1.schemas import ChartLevelItem, DashboardProgramResponse, DashboardSoResponse, DashboardTeacherResponse, IndicatorsChartResponse, ProgramProgressItem, SoProgressItem, TeacherProgressItem
router = APIRouter(tags=['Dashboards'])

@router.get('/dashboard/program', response_model=DashboardProgramResponse)
async def dashboard_program(period_id: int, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('DASHBOARD_PROGRAM'))):
    return await use_cases.dashboard_program(period_id=period_id, context=build_context(db), _=_)

@router.get('/dashboard/so', response_model=DashboardSoResponse)
async def dashboard_so(period_id: int, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('DASHBOARD_SO'))):
    return await use_cases.dashboard_so(period_id=period_id, context=build_context(db), _=_)

@router.get('/dashboard/teacher', response_model=DashboardTeacherResponse)
async def dashboard_teacher(period_id: int, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('DASHBOARD_TEACHER'))):
    return await use_cases.dashboard_teacher(period_id=period_id, context=build_context(db), _=_)

@router.get('/indicators/chart', response_model=IndicatorsChartResponse)
def indicators_chart(period_id: int, db: Session=Depends(db_session), _: CurrentUser=Depends(require_permission('INDICATOR_CHART'))):
    return use_cases.indicators_chart(period_id=period_id, context=build_context(db), _=_)
