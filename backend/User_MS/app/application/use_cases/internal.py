"""Application use cases extracted from HTTP; adapters are supplied through ports."""
from typing import Any
from app.application.ports.context import ApplicationContext
from app.application.ports.errors import ApplicationError, RemoteServiceError, EntityNotFoundError, EntityAlreadyExistsError, InvalidReferenceError
from app.application.dto import *

def get_student(student_id: int, context: ApplicationContext=None):
    student = context.repositories.student.get_by_id(student_id)
    if not student:
        raise ApplicationError('not_found', 'Student not found.')
    return student

def user_exists(user_id: int, context: ApplicationContext=None):
    if not context.repositories.user.get_by_id(user_id):
        raise ApplicationError('not_found', 'User not found.')
    return {'exists': True}

def subject_exists(nrc: int, context: ApplicationContext=None):
    subject = context.repositories.subject.get_by_id(nrc)
    if not subject:
        raise ApplicationError('not_found', 'Subject not found.')
    return {'exists': True, 'periods_id': subject.periods_id}

def period_exists(period_id: int, context: ApplicationContext=None):
    if not context.repositories.period.get_by_id(period_id):
        raise ApplicationError('not_found', 'Period not found.')
    return {'exists': True}

def is_enrolled(nrc: int, student_id: int, context: ApplicationContext=None):
    if not context.repositories.enrollment.is_enrolled(student_id, nrc):
        raise ApplicationError('not_found', 'Not enrolled.')
    return {'enrolled': True}

def teacher_has_subject(user_id: int, nrc: int, context: ApplicationContext=None):
    if not context.repositories.teacher_subject.has_subject(user_id, nrc):
        raise ApplicationError('not_found', 'Not assigned.')
    return {'assigned': True}

def teacher_subjects(user_id: int, context: ApplicationContext=None) -> list[int]:
    return context.repositories.teacher_subject.nrcs_for_user(user_id)

def subjects_students_count(payload: SubjectsCountRequest, context: ApplicationContext=None) -> dict[int, int]:
    return context.repositories.enrollment.counts_for_nrcs(payload.nrcs)

def subjects_teachers(payload: SubjectsCountRequest, context: ApplicationContext=None) -> dict[int, list[int]]:
    """nrc -> [user_id, ...] de los profesores que lo dictan. Batch para el
    dashboard de avance por profesor (Assesment_MS)."""
    return context.repositories.teacher_subject.teachers_for_nrcs(payload.nrcs)

def subjects_programs(payload: SubjectsCountRequest, context: ApplicationContext=None) -> dict[int, str]:
    """nrc -> program_id. Batch para el dashboard de avance por programa."""
    return context.repositories.subject.programs_for_nrcs(payload.nrcs)
