"""Application use cases extracted from HTTP; adapters are supplied through ports."""
from typing import Any
from app.application.ports.context import ApplicationContext
from app.application.ports.errors import ApplicationError, RemoteServiceError, EntityNotFoundError, EntityAlreadyExistsError, InvalidReferenceError
from app.application.dto import *
import logging
from app.application.services.password_policy import PasswordPolicyError, validate_new_password
audit = logging.getLogger('mesoftx.audit')

def my_subjects(context: ApplicationContext=None, current_user=None):
    return context.repositories.teacher_subject.subjects_for_user(current_user.id)

def my_pending_subjects(context: ApplicationContext=None, current_user=None):
    """NRC asignados a los que aún no se les cargó ningún estudiante (paso 13)."""
    return context.repositories.teacher_subject.pending_subjects_for_user(current_user.id)

def change_my_password(payload: PasswordChange, context: ApplicationContext=None, current_user=None):
    """El usuario cambia su propia contraseña (derecho de actualización, Ley 1581)."""
    if not current_user.password or not context.verify_password(payload.current_password, current_user.password):
        raise ApplicationError('bad_request', 'La contraseña actual no es correcta.')
    try:
        validate_new_password(payload.new_password, current=payload.current_password)
    except PasswordPolicyError as exc:
        raise ApplicationError('invalid', str(exc)) from exc
    context.repositories.user.update_user(current_user.id, {'password': context.hash_password(payload.new_password)})
    audit.info('PASSWORD_CHANGED user=%s', current_user.id)
