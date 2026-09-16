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
    ProgramProgressItem,
    SoProgressItem,
    TeacherProgressItem,
)

router = APIRouter(tags=["Dashboards"])

_SERVICE_DOWN = HTTPException(
    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    detail="Servicio de usuarios no disponible",
    headers={"Retry-After": "5"},
)


async def _enrolled_counts(nrcs: list[int]) -> dict[int, int]:
    """Matriculados por NRC en 1 batch; 503 si User_MS no responde."""
    try:
        return await UserMsClient().enrolled_counts(nrcs)
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc


@router.get("/dashboard/program", response_model=DashboardProgramResponse)
async def dashboard_program(period_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("DASHBOARD_PROGRAM"))):
    repo = DashboardRepository(db)
    rows = repo.expected_rows(period_id)  # (schedule_id, subjects_id, indicadores)
    nrcs = list({subjects_id for _, subjects_id, _ in rows})

    counts = await _enrolled_counts(nrcs)
    try:
        programs = await UserMsClient().subjects_programs(nrcs)
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc

    # Esperadas por programa: Σ (indicadores × matriculados) del NRC, agrupado
    # por el program_id que resuelve User_MS. Un NRC sin programa se ignora.
    expected_by_program: dict[str, int] = {}
    for _, subjects_id, indic in rows:
        program_id = programs.get(subjects_id)
        if program_id is None:
            continue
        expected_by_program[program_id] = (
            expected_by_program.get(program_id, 0) + indic * counts.get(subjects_id, 0)
        )

    # Hechas por programa: se agrupan las rúbricas por el program_id de su NRC.
    done_by_program: dict[str, int] = {}
    for subjects_id, done in repo.progress_by_subject(period_id):
        program_id = programs.get(subjects_id)
        if program_id is None:
            continue
        done_by_program[program_id] = done_by_program.get(program_id, 0) + done

    program_ids = sorted(set(expected_by_program) | set(done_by_program))
    items = [
        ProgramProgressItem(
            program_id=pid,
            expected=expected_by_program.get(pid, 0),
            done=done_by_program.get(pid, 0),
        )
        for pid in program_ids
    ]
    total_expected = sum(i.expected for i in items)
    total_done = sum(i.done for i in items)
    return DashboardProgramResponse(period_id=period_id, expected=total_expected, done=total_done, items=items)


@router.get("/dashboard/so", response_model=DashboardSoResponse)
async def dashboard_so(period_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("DASHBOARD_SO"))):
    repo = DashboardRepository(db)
    rows = repo.expected_rows_by_so(period_id)  # (so_id, subjects_id, indicadores)
    nrcs = list({subjects_id for _, subjects_id, _ in rows})

    counts = await _enrolled_counts(nrcs)

    expected_by_so: dict[str, int] = {}
    for so_id, subjects_id, indic in rows:
        expected_by_so[so_id] = expected_by_so.get(so_id, 0) + indic * counts.get(subjects_id, 0)

    done_by_so = dict(repo.progress_by_so(period_id))
    so_ids = sorted(set(repo.scheduled_so_ids(period_id)) | set(expected_by_so) | set(done_by_so))
    items = [
        SoProgressItem(so_id=so, expected=expected_by_so.get(so, 0), done=done_by_so.get(so, 0))
        for so in so_ids
    ]
    total_expected = sum(i.expected for i in items)
    return DashboardSoResponse(period_id=period_id, expected=total_expected, items=items)


@router.get("/dashboard/teacher", response_model=DashboardTeacherResponse)
async def dashboard_teacher(period_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("DASHBOARD_TEACHER"))):
    repo = DashboardRepository(db)
    rows = repo.expected_rows(period_id)  # (schedule_id, subjects_id, indicadores)
    nrcs = list({subjects_id for _, subjects_id, _ in rows})

    counts = await _enrolled_counts(nrcs)
    try:
        teachers = await UserMsClient().subjects_teachers(nrcs)
    except httpx.HTTPError as exc:
        raise _SERVICE_DOWN from exc

    # Esperadas por profesor: la suma sobre los NRC que tiene asignados. Si un
    # NRC lo dictan dos profesores, cada uno tiene esas esperadas (no se reparten).
    expected_by_teacher: dict[int, int] = {}
    for _, subjects_id, indic in rows:
        esperadas_nrc = indic * counts.get(subjects_id, 0)
        for uid in teachers.get(subjects_id, []):
            expected_by_teacher[uid] = expected_by_teacher.get(uid, 0) + esperadas_nrc

    done_by_teacher = dict(repo.progress_by_teacher(period_id))
    uids = sorted(set(expected_by_teacher) | set(done_by_teacher))
    items = [
        TeacherProgressItem(
            evaluator_user_id=uid,
            expected=expected_by_teacher.get(uid, 0),
            done=done_by_teacher.get(uid, 0),
        )
        for uid in uids
    ]
    # El total del periodo es el de esperadas/hechas reales, no la suma por
    # profesor (un NRC compartido contaría doble). Se calcula sin duplicar NRC.
    total_expected = sum(indic * counts.get(subjects_id, 0) for _, subjects_id, indic in rows)
    total_done = sum(done_by_teacher.values())
    return DashboardTeacherResponse(period_id=period_id, expected=total_expected, done=total_done, items=items)


@router.get("/indicators/chart", response_model=IndicatorsChartResponse)
def indicators_chart(period_id: int, db: Session = Depends(db_session), _: CurrentUser = Depends(require_permission("INDICATOR_CHART"))):
    items = [
        ChartLevelItem(performance_id=pid, rank=rank, level_id=lid, total=total)
        for pid, rank, lid, total in DashboardRepository(db).indicators_chart(period_id)
    ]
    return IndicatorsChartResponse(period_id=period_id, items=items)
