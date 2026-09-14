import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.clients.user_ms_client import UserMsClient
from app.infrastructure.repositories.sqlalchemy_repositories import DashboardRepository
from app.interfaces.api.v1.dependencies import CurrentUser, db_session, require_permission
from app.interfaces.api.v1.schemas import (
    ChartLevelItem,
    DashboardProgramResponse,
    DashboardSoResponse,
    DashboardTeacherResponse,
    IndicatorsChartResponse,
    SoProgressItem,
    TeacherProgressItem,
)

router = APIRouter(tags=["Dashboards"])

_SERVICE_DOWN = HTTPException(
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    detail="Servicio de usuarios no disponible",
    headers={"Retry-After": "5"},
)


async def _expected_total(db: Session, period_id: int) -> int:
    """esperadas = SUM(indicadores * matriculados[nrc]), matriculados en 1 batch."""
    rows = DashboardRepository(db).expected_rows(period_id)
    nrcs = list({subjects_id for _, subjects_id, _ in rows})
    try:
        counts = await UserMsClient().enrolled_counts(nrcs)
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc
    return sum(indic * counts.get(subjects_id, 0) for _, subjects_id, indic in rows)


@router.get("/dashboard/program", response_model=DashboardProgramResponse)
async def dashboard_program(period_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("DASHBOARD_PROGRAM"))):
    expected = await _expected_total(db, period_id)
    done = sum(done for _, done in DashboardRepository(db).progress_by_so(period_id))
    return DashboardProgramResponse(period_id=period_id, expected=expected, done=done)


@router.get("/dashboard/so", response_model=DashboardSoResponse)
async def dashboard_so(period_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("DASHBOARD_SO"))):
    expected = await _expected_total(db, period_id)
    items = [SoProgressItem(so_id=so, done=done) for so, done in DashboardRepository(db).progress_by_so(period_id)]
    return DashboardSoResponse(period_id=period_id, expected=expected, items=items)


@router.get("/dashboard/teacher", response_model=DashboardTeacherResponse)
def dashboard_teacher(period_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("DASHBOARD_TEACHER"))):
    items = [
        TeacherProgressItem(evaluator_user_id=uid, done=done)
        for uid, done in DashboardRepository(db).progress_by_teacher(period_id)
    ]
    return DashboardTeacherResponse(period_id=period_id, items=items)


@router.get("/indicators/chart", response_model=IndicatorsChartResponse)
def indicators_chart(period_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("INDICATOR_CHART"))):
    items = [
        ChartLevelItem(performance_id=pid, rank=rank, level_id=lid, total=total)
        for pid, rank, lid, total in DashboardRepository(db).indicators_chart(period_id)
    ]
    return IndicatorsChartResponse(period_id=period_id, items=items)
