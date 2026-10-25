"""Application use cases extracted from HTTP; adapters are supplied through ports."""
from typing import Any
from app.application.ports.context import ApplicationContext
from app.application.ports.errors import ApplicationError, RemoteServiceError, EntityNotFoundError, EntityAlreadyExistsError, InvalidReferenceError
from app.application.dto import *
import logging
from app.application.services.password_policy import PasswordPolicyError, validate_new_password
from app.application.services.user_service import UserService
audit = logging.getLogger('mesoftx.audit')
ALLOWED_TARGET_ROLES = {'USER_CRUD': {'Coordinador'}, 'TEACHER_CRUD': {'Profesor', 'Auditor'}}

def _is_teacher_role(role_name: str) -> bool:
    return role_name.strip().lower().startswith('profesor')

def _is_target_role_allowed(target_role_name: str, permissions: list[str]) -> bool:
    allowed: set[str] = set()
    for permission, roles in ALLOWED_TARGET_ROLES.items():
        if permission in permissions:
            allowed |= roles
    return target_role_name in allowed or ('Profesor' in allowed and _is_teacher_role(target_role_name))

def _authorize_target(context: ApplicationContext, current_user, user_id: int):
    """Un usuario solo puede administrar cuentas cuyo rol está dentro de lo que su propio
    permiso le deja crear (misma regla que create_user) y nunca la suya propia: así no hay
    autoelevación de privilegios ni se puede borrar/desactivar a un Administrativo con TEACHER_CRUD."""
    target = context.repositories.user.get_by_id(user_id)
    if not target:
        raise ApplicationError('not_found', 'User not found.')
    if target.id == current_user.id:
        raise ApplicationError('forbidden', 'No puede modificar su propia cuenta por este medio; use Mi cuenta.')
    perms = getattr(current_user, 'permissions', [])
    if not _is_target_role_allowed(target.role.name, perms):
        raise ApplicationError('forbidden', f'No puede administrar usuarios con el rol {target.role.name}')
    return target

def list_users(context: ApplicationContext=None, current_user=None) -> list[UserResponse]:
    perms = getattr(current_user, 'permissions', [])
    if 'USER_CRUD' not in perms and 'TEACHER_CRUD' not in perms:
        raise ApplicationError('forbidden', 'Insufficient permissions.')
    users = UserService(context.repositories.user, context.hash_password).list()
    return [UserResponse.from_model(user) for user in users]

def get_user(user_id: int, context: ApplicationContext=None, current_user=None) -> UserResponse:
    perms = getattr(current_user, 'permissions', [])
    if 'USER_CRUD' not in perms and 'TEACHER_CRUD' not in perms and (current_user.id != user_id):
        raise ApplicationError('forbidden', 'Not allowed to view this user.')
    try:
        user = UserService(context.repositories.user, context.hash_password).get(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise

def create_user(payload: UserCreate, context: ApplicationContext=None, current_user=None) -> UserResponse:
    perms = getattr(current_user, 'permissions', [])
    if 'USER_CRUD' not in perms and 'TEACHER_CRUD' not in perms:
        raise ApplicationError('forbidden', 'Insufficient permissions.')
    target_role = context.repositories.role.get_by_id(payload.role_id)
    if not target_role:
        raise ApplicationError('invalid', 'role_id inexistente')
    if not _is_target_role_allowed(target_role.name, perms):
        raise ApplicationError('forbidden', f'No puede crear usuarios con el rol {target_role.name}')
    if _is_teacher_role(target_role.name) and (not payload.program_id):
        raise ApplicationError('invalid', 'program_id es obligatorio para Profesor')
    if not _is_teacher_role(target_role.name) and payload.program_id:
        raise ApplicationError('invalid', 'Solo el Profesor pertenece a un programa')
    try:
        validate_new_password(payload.password)
    except PasswordPolicyError as exc:
        raise ApplicationError('invalid', str(exc)) from exc
    data = payload.model_dump()
    data['created_by'] = current_user.id
    try:
        user = UserService(context.repositories.user, context.hash_password).create(data)
        return UserResponse.from_model(user)
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise

def update_user(user_id: int, payload: UserUpdate, context: ApplicationContext=None, current_user=None) -> UserResponse:
    target = _authorize_target(context, current_user, user_id)
    data = payload.model_dump(exclude_unset=True)
    perms = getattr(current_user, 'permissions', [])
    if data.get('role_id') is not None:
        new_role = context.repositories.role.get_by_id(data['role_id'])
        if not new_role:
            raise ApplicationError('invalid', 'role_id inexistente')
        if not _is_target_role_allowed(new_role.name, perms):
            raise ApplicationError('forbidden', f'No puede asignar el rol {new_role.name}')
    if data.get('password'):
        try:
            validate_new_password(data['password'])
        except PasswordPolicyError as exc:
            raise ApplicationError('invalid', str(exc)) from exc
    audit.info('USER_UPDATED actor=%s target=%s fields=%s', current_user.id, target.id, sorted(data))
    try:
        user = UserService(context.repositories.user, context.hash_password).update(user_id, data)
        return UserResponse.from_model(user)
    except (EntityAlreadyExistsError, EntityNotFoundError) as exc:
        raise

async def delete_user(user_id: int, context: ApplicationContext=None, current_user=None):
    """Borra un profesor/auditor. Antes borra en cascada sus rúbricas en
    Assesment_MS; si hay periodos cerrados -> 409; si el servicio no responde
    -> 503 y no borra nada (paso 12)."""
    repo = context.repositories.user
    _authorize_target(context, current_user, user_id)
    audit.info('USER_DELETED actor=%s target=%s', current_user.id, user_id)
    client = context.directory
    try:
        ok, closed = await client.delete_rubrics(evaluator_user_id=user_id)
    except RemoteServiceError as exc:
        raise ApplicationError('unavailable', 'Servicio de valoraciones no disponible; no se borró nada') from exc
    if not ok:
        raise ApplicationError('conflict', f'Tiene valoraciones en periodos cerrados: {', '.join(closed)}')
    repo.delete(user_id)
    return None

def activate_user(user_id: int, context: ApplicationContext=None, current_user=None) -> UserResponse:
    _authorize_target(context, current_user, user_id)
    audit.info('USER_ACTIVATED actor=%s target=%s', current_user.id, user_id)
    try:
        user = UserService(context.repositories.user, context.hash_password).activate(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise

def deactivate_user(user_id: int, context: ApplicationContext=None, current_user=None) -> UserResponse:
    _authorize_target(context, current_user, user_id)
    audit.info('USER_DEACTIVATED actor=%s target=%s', current_user.id, user_id)
    try:
        user = UserService(context.repositories.user, context.hash_password).deactivate(user_id)
        return UserResponse.from_model(user)
    except EntityNotFoundError as exc:
        raise
