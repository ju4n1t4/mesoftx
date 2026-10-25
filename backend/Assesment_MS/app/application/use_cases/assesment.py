"""Application use cases extracted from HTTP; adapters are supplied through ports."""
from typing import Any
from app.application.ports.context import ApplicationContext
from app.application.ports.errors import ApplicationError, RemoteServiceError, EntityNotFoundError, EntityAlreadyExistsError, InvalidReferenceError
from app.application.dto import *
from typing import Any
from app.application.services.catalog_service import CatalogService
_SERVICE_DOWN = ApplicationError('unavailable', 'Servicio de usuarios no disponible')

async def _teacher_nrcs_or_none(user: Any, *, context: ApplicationContext) -> list[int] | None:
    """Alcance (paso 13): si el usuario es Profesor (único con program_id), devuelve
    la lista de sus NRC para filtrar; si es Coordinador/Auditor devuelve None (sin
    filtro). Los NRC se piden a User_MS en una sola llamada."""
    if user.program_id is None:
        return None
    try:
        return await context.directory.teacher_subjects(user.user_id)
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc

def list_so(context: ApplicationContext=None, _: Any=None):
    return CatalogService(context.repositories.student_outcome).list()

def create_so(payload: StudentOutcomeCreate, context: ApplicationContext=None, _: Any=None):
    try:
        return CatalogService(context.repositories.student_outcome).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise

def update_so(so_id: str, payload: StudentOutcomeUpdate, context: ApplicationContext=None, _: Any=None):
    try:
        return CatalogService(context.repositories.student_outcome).update(so_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise

def delete_so(so_id: str, context: ApplicationContext=None, _: Any=None):
    repo = context.repositories.rubric
    closed = _closed_periods_for_so(context, so_id)
    if closed:
        raise ApplicationError('conflict', f'No se puede borrar: tiene valoraciones en periodos cerrados: {', '.join(closed)}')
    if not context.repositories.student_outcome.delete(so_id):
        raise EntityNotFoundError('SO not found.')
    return None

def _closed_periods_for_so(context: ApplicationContext, so_id: str) -> list[str]:
    return context.repositories.so_schedule.closed_periods_for_so(so_id)

def list_performance(so_id: str, context: ApplicationContext=None, _: Any=None):
    return context.repositories.performance.list_by_so(so_id)

def list_levels(performance_id: str, context: ApplicationContext=None, _: Any=None):
    return context.repositories.level.list_by_performance(performance_id)

def create_performance(payload: PerformanceCreate, context: ApplicationContext=None, _: Any=None):
    try:
        return context.repositories.performance.create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise

def update_performance(performance_id: str, payload: PerformanceUpdate, context: ApplicationContext=None, _: Any=None):
    try:
        result = context.repositories.performance.update(performance_id, payload.model_dump(exclude_unset=True))
        if result is None:
            raise EntityNotFoundError('Performance not found.')
        return result
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise

def delete_performance(performance_id: str, context: ApplicationContext=None, _: Any=None):
    closed = context.repositories.rubric.closed_periods_for_performance(performance_id)
    if closed:
        raise ApplicationError('conflict', f'No se puede borrar: tiene valoraciones en periodos cerrados: {', '.join(closed)}')
    if not context.repositories.performance.delete(performance_id):
        raise EntityNotFoundError('Performance not found.')
    return None

def create_level(payload: LevelCreate, context: ApplicationContext=None, _: Any=None):
    try:
        return context.repositories.level.create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise

def update_level(level_id: str, payload: LevelUpdate, context: ApplicationContext=None, _: Any=None):
    try:
        result = context.repositories.level.update(level_id, payload.model_dump(exclude_unset=True))
        if result is None:
            raise EntityNotFoundError('Level not found.')
        return result
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise

def delete_level(level_id: str, context: ApplicationContext=None, _: Any=None):
    level = context.repositories.level.get_by_id(level_id)
    if not level:
        raise EntityNotFoundError('Level not found.')
    closed = context.repositories.rubric.closed_periods_for_level(level.performance_id, level_id)
    if closed:
        raise ApplicationError('conflict', f'No se puede borrar: tiene valoraciones en periodos cerrados: {', '.join(closed)}')
    context.repositories.level.delete(level_id)
    return None

async def list_so_schedule(period_id: int | None=None, context: ApplicationContext=None, user: Any=None):
    nrcs = await _teacher_nrcs_or_none(user, context=context)
    if nrcs is not None and (not nrcs):
        return []
    repo = context.repositories.so_schedule
    if period_id is not None:
        return repo.list_by_period_scoped(period_id, nrcs)
    return repo.list_all_scoped(nrcs)

async def list_current_schedule(context: ApplicationContext=None, user: Any=None):
    nrcs = await _teacher_nrcs_or_none(user, context=context)
    if nrcs is not None and (not nrcs):
        return []
    return context.repositories.so_schedule.list_current_scoped(nrcs)

async def create_so_schedule(payload: SoScheduleCreate, context: ApplicationContext=None, current_user: Any=None):
    try:
        if not await context.directory.period_exists(payload.period_id):
            raise ApplicationError('invalid', 'El periodo no existe')
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc
    data = payload.model_dump()
    data['coordinator_user_id'] = current_user.user_id
    try:
        return context.repositories.so_schedule.create(data)
    except InvalidReferenceError as exc:
        raise

def delete_so_schedule(schedule_id: int, context: ApplicationContext=None, _: Any=None):
    repo = context.repositories.so_schedule
    sched = repo.get_by_id(schedule_id)
    if not sched:
        raise EntityNotFoundError('Schedule not found.')
    if sched.status == 'CERRADO':
        raise ApplicationError('conflict', f'No se puede borrar: tiene valoraciones en periodos cerrados: {sched.period_id}')
    repo.delete(schedule_id)
    return None

def get_schedule_subjects(schedule_id: int, context: ApplicationContext=None, _: Any=None):
    """NRC asignados a una programación. Lo usa la UI para precargar el diálogo
    de NRC y para contar cuántos NRC valoran cada SO."""
    repo = context.repositories.so_schedule
    if not repo.get_by_id(schedule_id):
        raise EntityNotFoundError('Schedule not found.')
    return repo.nrcs_for_schedule(schedule_id)

async def set_schedule_subjects(schedule_id: int, payload: ScheduleSubjectsUpdate, context: ApplicationContext=None, _: Any=None):
    repo = context.repositories.so_schedule
    sched = repo.get_by_id(schedule_id)
    if not sched:
        raise EntityNotFoundError('Schedule not found.')
    if sched.status == 'CERRADO':
        raise ApplicationError('conflict', 'La programación está cerrada')
    client = context.directory
    try:
        for nrc in payload.nrcs:
            period = await client.subject_period(nrc)
            if period is None:
                raise ApplicationError('invalid', f'El NRC {nrc} no existe')
            if period != sched.period_id:
                raise ApplicationError('invalid', f'El NRC {nrc} no es del periodo de la programación')
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc
    repo.replace_subjects(schedule_id, payload.nrcs)
    return repo.get_by_id(schedule_id)

def change_status(schedule_id: int, payload: ScheduleStatusUpdate, context: ApplicationContext=None, current_user: Any=None):
    from datetime import datetime, timezone
    repo = context.repositories.so_schedule
    sched = repo.get_by_id(schedule_id)
    if not sched:
        raise EntityNotFoundError('Schedule not found.')
    allowed = {('PLANIFICADO', 'EN_CURSO'), ('EN_CURSO', 'CERRADO'), ('CERRADO', 'EN_CURSO'), ('EN_CURSO', 'PLANIFICADO')}
    transition = (sched.status, payload.status)
    if transition == ('EN_CURSO', 'PLANIFICADO') and repo.has_rubrics(schedule_id):
        raise ApplicationError('conflict', 'Ya hay valoraciones registradas')
    if transition not in allowed:
        raise ApplicationError('conflict', 'Transición de estado no permitida')
    return repo.update(schedule_id, {'status': payload.status, 'updated_by': current_user.user_id, 'updated_at': datetime.now(timezone.utc)})

def get_period_target(period_id: int, context: ApplicationContext=None, _: Any=None):
    """Devuelve la meta de logro configurada para el periodo. 404 si no existe."""
    target = context.repositories.period_target.get(period_id)
    if target is None:
        raise ApplicationError('not_found', 'Meta no configurada para el periodo')
    return target

async def set_period_target(period_id: int, payload: PeriodTargetUpdate, context: ApplicationContext=None, current_user: Any=None):
    """Fija o actualiza la meta de logro del periodo. Rechaza el cambio si el
    periodo ya tiene programaciones cerradas, para no alterar el histórico."""
    try:
        if not await context.directory.period_exists(period_id):
            raise ApplicationError('not_found', 'El periodo no existe')
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc
    if context.repositories.so_schedule.has_closed_in_period(period_id):
        raise ApplicationError('conflict', 'La meta no se puede cambiar: el periodo tiene programaciones cerradas')
    return context.repositories.period_target.upsert(period_id, payload.target_pct, current_user.user_id)

async def my_assessments(context: ApplicationContext=None, current_user: Any=None):
    try:
        my_nrcs = await context.directory.teacher_subjects(current_user.user_id)
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc
    if not my_nrcs:
        return []
    return [AssessmentToDoResponse(**row) for row in context.repositories.so_schedule.assessments_for_nrcs(my_nrcs)]

async def list_rubric(period_id: int | None=None, schedule_id: int | None=None, subjects_id: int | None=None, student_id: int | None=None, context: ApplicationContext=None, user: Any=None):
    nrcs = await _teacher_nrcs_or_none(user, context=context)
    if nrcs is not None and (not nrcs):
        return []
    return context.repositories.rubric.list_filtered(period_id=period_id, schedule_id=schedule_id, subjects_id=subjects_id, student_id=student_id, nrcs=nrcs)

async def create_rubric(payload: RubricCreate, context: ApplicationContext=None, current_user: Any=None):
    sched = context.repositories.so_schedule.get_by_id(payload.schedule_id)
    if not sched:
        raise ApplicationError('invalid', 'La programación no existe')
    if sched.status == 'PLANIFICADO':
        raise ApplicationError('conflict', 'Ese student outcome aún no se ha abierto para valoración')
    if sched.status == 'CERRADO':
        raise ApplicationError('conflict', 'Ese periodo ya fue cerrado. Pídele al coordinador que lo reabra')
    if payload.subjects_id not in context.repositories.so_schedule.nrcs_for_schedule(payload.schedule_id):
        raise ApplicationError('conflict', 'Ese curso no valora este student outcome en este periodo')
    client = context.directory
    try:
        if not await client.teacher_has_subject(current_user.user_id, payload.subjects_id):
            raise ApplicationError('forbidden', 'Ese curso no está asignado a usted')
        if not await client.student_enrolled(payload.student_id, payload.subjects_id):
            raise ApplicationError('invalid', 'El estudiante no está matriculado en ese curso')
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc
    perf = context.repositories.performance.get_by_id(payload.performance_id)
    if not perf or perf.so_id != sched.so_id:
        raise ApplicationError('invalid', 'Ese indicador no es de este student outcome')
    data = payload.model_dump()
    data['evaluator_user_id'] = current_user.user_id
    try:
        return context.repositories.rubric.create(data)
    except InvalidReferenceError as exc:
        raise ApplicationError('conflict', 'Ya valoraste a este estudiante en este indicador') from exc

def update_rubric(rubric_id: int, payload: RubricUpdate, context: ApplicationContext=None, current_user: Any=None):
    repo = context.repositories.rubric
    rubric = repo.get_by_id(rubric_id)
    if not rubric:
        raise EntityNotFoundError('Rubric not found.')
    if rubric.evaluator_user_id != current_user.user_id:
        raise ApplicationError('forbidden', 'No puede corregir valoraciones de otro evaluador')
    sched = context.repositories.so_schedule.get_by_id(rubric.schedule_id)
    if sched and sched.status == 'CERRADO':
        raise ApplicationError('conflict', 'Ese periodo ya fue cerrado')
    try:
        return repo.update(rubric_id, payload.model_dump(exclude_unset=True))
    except InvalidReferenceError as exc:
        raise

async def create_evidence(payload: EvidenceCreate, context: ApplicationContext=None, current_user: Any=None):
    sched = context.repositories.so_schedule.get_by_id(payload.schedule_id)
    if not sched or sched.status != 'EN_CURSO':
        raise ApplicationError('conflict', 'La programación no está en curso')
    if payload.subjects_id not in context.repositories.so_schedule.nrcs_for_schedule(payload.schedule_id):
        raise ApplicationError('conflict', 'Ese curso no valora este student outcome en este periodo')
    client = context.directory
    try:
        if not await client.teacher_has_subject(current_user.user_id, payload.subjects_id):
            raise ApplicationError('forbidden', 'Ese curso no está asignado a usted')
        if not await client.student_enrolled(payload.student_id, payload.subjects_id):
            raise ApplicationError('invalid', 'El estudiante no está matriculado en ese curso')
    except RemoteServiceError as exc:
        raise _SERVICE_DOWN from exc
    data = payload.model_dump()
    data['uploaded_by'] = current_user.user_id
    try:
        return context.repositories.evidence.create(data)
    except InvalidReferenceError as exc:
        raise
