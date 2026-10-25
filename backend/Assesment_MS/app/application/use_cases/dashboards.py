"""Application use cases extracted from HTTP; adapters are supplied through ports."""
from typing import Any
from app.application.ports.context import ApplicationContext
from app.application.ports.errors import ApplicationError, RemoteServiceError, EntityNotFoundError, EntityAlreadyExistsError, InvalidReferenceError
from app.application.dto import *
_SERVICE_DOWN = ApplicationError('unavailable', 'Servicio de usuarios no disponible')

async def _enrolled_counts(nrcs: list[int], *, context: ApplicationContext) -> dict[int, int]:
    """Matriculados por NRC en 1 batch; 503 si User_MS no responde."""
    try:
        return await context.directory.enrolled_counts(nrcs)
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc

async def dashboard_program(period_id: int, context: ApplicationContext=None, _: Any=None):
    repo = context.repositories.dashboard
    rows = repo.expected_rows(period_id)
    nrcs = list({subjects_id for _, subjects_id, _ in rows})
    counts = await _enrolled_counts(nrcs, context=context)
    try:
        programs = await context.directory.subjects_programs(nrcs)
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc
    expected_by_program: dict[str, int] = {}
    for _, subjects_id, indic in rows:
        program_id = programs.get(subjects_id)
        if program_id is None:
            continue
        expected_by_program[program_id] = expected_by_program.get(program_id, 0) + indic * counts.get(subjects_id, 0)
    done_by_program: dict[str, int] = {}
    for subjects_id, done in repo.progress_by_subject(period_id):
        program_id = programs.get(subjects_id)
        if program_id is None:
            continue
        done_by_program[program_id] = done_by_program.get(program_id, 0) + done
    program_ids = sorted(set(expected_by_program) | set(done_by_program))
    items = [ProgramProgressItem(program_id=pid, expected=expected_by_program.get(pid, 0), done=done_by_program.get(pid, 0)) for pid in program_ids]
    total_expected = sum((i.expected for i in items))
    total_done = sum((i.done for i in items))
    return DashboardProgramResponse(period_id=period_id, expected=total_expected, done=total_done, items=items)

async def dashboard_so(period_id: int, context: ApplicationContext=None, _: Any=None):
    repo = context.repositories.dashboard
    rows = repo.expected_rows_by_so(period_id)
    nrcs = list({subjects_id for _, subjects_id, _ in rows})
    counts = await _enrolled_counts(nrcs, context=context)
    expected_by_so: dict[str, int] = {}
    for so_id, subjects_id, indic in rows:
        expected_by_so[so_id] = expected_by_so.get(so_id, 0) + indic * counts.get(subjects_id, 0)
    done_by_so = dict(repo.progress_by_so(period_id))
    so_ids = sorted(set(repo.scheduled_so_ids(period_id)) | set(expected_by_so) | set(done_by_so))
    items = [SoProgressItem(so_id=so, expected=expected_by_so.get(so, 0), done=done_by_so.get(so, 0)) for so in so_ids]
    total_expected = sum((i.expected for i in items))
    return DashboardSoResponse(period_id=period_id, expected=total_expected, items=items)

async def dashboard_teacher(period_id: int, context: ApplicationContext=None, _: Any=None):
    repo = context.repositories.dashboard
    rows = repo.expected_rows(period_id)
    nrcs = list({subjects_id for _, subjects_id, _ in rows})
    counts = await _enrolled_counts(nrcs, context=context)
    try:
        teachers = await context.directory.subjects_teachers(nrcs)
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc
    expected_by_teacher: dict[int, int] = {}
    for _, subjects_id, indic in rows:
        esperadas_nrc = indic * counts.get(subjects_id, 0)
        for uid in teachers.get(subjects_id, []):
            expected_by_teacher[uid] = expected_by_teacher.get(uid, 0) + esperadas_nrc
    done_by_teacher = dict(repo.progress_by_teacher(period_id))
    uids = sorted(set(expected_by_teacher) | set(done_by_teacher))
    items = [TeacherProgressItem(evaluator_user_id=uid, expected=expected_by_teacher.get(uid, 0), done=done_by_teacher.get(uid, 0)) for uid in uids]
    total_expected = sum((indic * counts.get(subjects_id, 0) for _, subjects_id, indic in rows))
    total_done = sum(done_by_teacher.values())
    return DashboardTeacherResponse(period_id=period_id, expected=total_expected, done=total_done, items=items)

def indicators_chart(period_id: int, context: ApplicationContext=None, _: Any=None):
    items = [ChartLevelItem(performance_id=pid, rank=rank, level_id=lid, total=total) for pid, rank, lid, total in context.repositories.dashboard.indicators_chart(period_id)]
    return IndicatorsChartResponse(period_id=period_id, items=items)
