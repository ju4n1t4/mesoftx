"""Application use cases extracted from HTTP; adapters are supplied through ports."""
from typing import Any
from app.application.ports.context import ApplicationContext
from app.application.ports.errors import ApplicationError, RemoteServiceError, EntityNotFoundError, EntityAlreadyExistsError, InvalidReferenceError
from app.application.dto import *
from typing import Any
from app.application.services.catalog_service import CatalogService

def list_roles(context: ApplicationContext=None, current_user=None):
    permissions = set(getattr(current_user, 'permissions', []))
    if not {'USER_CRUD', 'TEACHER_CRUD'} & permissions:
        raise ApplicationError('forbidden', 'Insufficient permissions.')
    return CatalogService(context.repositories.role).list()

def create_role(payload: RoleCreate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.role).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise

def update_role(entity_id: int, payload: RoleUpdate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.role).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise

def delete_role(entity_id: int, context: ApplicationContext=None, _=None):
    repo = context.repositories.role
    count = repo.count_users(entity_id)
    if count > 0:
        raise ApplicationError('conflict', f'El perfil tiene {count} usuarios asignados')
    if not repo.delete(entity_id):
        raise EntityNotFoundError('Role not found.')
    return None

def list_permissions(context: ApplicationContext=None, _=None):
    return CatalogService(context.repositories.permission).list()

def get_role_permissions(entity_id: int, context: ApplicationContext=None, _=None):
    codes = context.repositories.role.codes_for_role(entity_id)
    if codes is None:
        raise EntityNotFoundError('Role not found.')
    return codes

def set_role_permissions(entity_id: int, payload: RolePermissionsUpdate, context: ApplicationContext=None, _=None):
    perm_ids = context.repositories.permission.ids_for_codes(payload.permission_codes)
    role = context.repositories.role.set_permissions(entity_id, perm_ids)
    if not role:
        raise EntityNotFoundError('Role not found.')
    return role

def list_colleges(context: ApplicationContext=None, _=None):
    return CatalogService(context.repositories.college).list()

def get_college(entity_id: str, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.college).get(entity_id)
    except EntityNotFoundError as exc:
        raise

def create_college(payload: CollegeCreate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.college).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise

def update_college(entity_id: str, payload: CollegeUpdate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.college).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise

def delete_college(entity_id: str, context: ApplicationContext=None, _=None):
    if not context.repositories.college.delete(entity_id):
        raise EntityNotFoundError('College not found.')
    return None

def list_programs(context: ApplicationContext=None, _=None):
    return CatalogService(context.repositories.program).list()

def get_program(entity_id: str, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.program).get(entity_id)
    except EntityNotFoundError as exc:
        raise

def create_program(payload: ProgramCreate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.program).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise

def update_program(entity_id: str, payload: ProgramUpdate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.program).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise

def delete_program(entity_id: str, context: ApplicationContext=None, _=None):
    if not context.repositories.program.delete(entity_id):
        raise EntityNotFoundError('Program not found.')
    return None

def list_periods(context: ApplicationContext=None, _=None):
    return CatalogService(context.repositories.period).list()

def get_period(entity_id: int, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.period).get(entity_id)
    except EntityNotFoundError as exc:
        raise

def create_period(payload: PeriodCreate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.period).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise

def update_period(entity_id: int, payload: PeriodUpdate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.period).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise

def delete_period(entity_id: int, context: ApplicationContext=None, _=None):
    if not context.repositories.period.delete(entity_id):
        raise EntityNotFoundError('Period not found.')
    return None

def list_subjects(context: ApplicationContext=None, _=None):
    return CatalogService(context.repositories.subject).list()

def get_subject(nrc: int, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.subject).get(nrc)
    except EntityNotFoundError as exc:
        raise

def create_subject(payload: SubjectCreate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.subject).create(payload.model_dump())
    except EntityAlreadyExistsError as exc:
        raise

def update_subject(nrc: int, payload: SubjectUpdate, context: ApplicationContext=None, _=None):
    try:
        return CatalogService(context.repositories.subject).update(nrc, payload.model_dump(exclude_unset=True))
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise

async def delete_subject(nrc: int, context: ApplicationContext=None, _=None):
    """Borra una materia (NRC). Antes borra en Assesment_MS sus rúbricas/evidencias
    y sus schedule_subjects; 409 si hay periodos cerrados; 503 si no responde."""
    repo = context.repositories.subject
    if not repo.get_by_id(nrc):
        raise EntityNotFoundError('Subject not found.')
    client = context.directory
    try:
        ok, closed = await client.delete_rubrics(subjects_id=nrc)
        if not ok:
            raise ApplicationError('conflict', f'Tiene valoraciones en periodos cerrados: {', '.join(closed)}')
        await client.delete_schedule_subjects(nrc)
    except RemoteServiceError as exc:
        raise ApplicationError('unavailable', 'Servicio de valoraciones no disponible; no se borró nada') from exc
    repo.delete(nrc)
    return None

def assign_teacher_subject(payload: TeacherSubjectCreate, context: ApplicationContext=None, current_user=None):
    data = payload.model_dump()
    data['assigned_by'] = current_user.id
    try:
        return context.repositories.teacher_subject.create(data)
    except EntityAlreadyExistsError as exc:
        raise

def list_teacher_subjects(user_id: int, context: ApplicationContext=None, _=None):
    """Asignaciones de un profesor: id de la asignación + datos de la materia,
    para listar y poder borrar por id (CRUD de la asignación)."""
    return context.repositories.teacher_subject.assignments_for_user(user_id)

def delete_teacher_subject(assignment_id: int, context: ApplicationContext=None, _=None):
    """Quita una asignación NRC-profesor. Borrado local (fila en teacher_subjects);
    no afecta al profesor ni a la materia, así que no hay borrado cruzado."""
    if not context.repositories.teacher_subject.delete(assignment_id):
        raise EntityNotFoundError('Assignment not found.')
    return None
