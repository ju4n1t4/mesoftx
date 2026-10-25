"""Application use cases extracted from HTTP; adapters are supplied through ports."""
from typing import Any
from app.application.ports.context import ApplicationContext
from app.application.ports.errors import ApplicationError, RemoteServiceError, EntityNotFoundError, EntityAlreadyExistsError, InvalidReferenceError
from app.application.dto import *

def upload_students(nrc: int, payload: StudentUploadRequest, context: ApplicationContext=None, current_user=None):
    """Carga la lista del curso. Deduplica por document_number; el primero que
    lo cargó gana (paso 13)."""
    subject = context.repositories.subject.get_by_id(nrc)
    if not subject:
        raise ApplicationError('not_found', 'Subject not found.')
    if not context.repositories.teacher_subject.has_subject(current_user.id, nrc):
        raise ApplicationError('forbidden', 'Ese curso no está asignado a usted')
    students_repo = context.repositories.student
    enroll_repo = context.repositories.enrollment
    created = already = enrolled = 0
    for row in payload.students:
        student = students_repo.get_by_document(row.document_number)
        if student is None:
            student = students_repo.create({'document_number': row.document_number, 'name': row.name, 'program_id': subject.program_id, 'created_by': current_user.id})
            created += 1
        else:
            already += 1
        if enroll_repo.enroll(student.id, nrc):
            enrolled += 1
    return StudentUploadResult(created=created, already_existed=already, enrolled=enrolled)

def list_subject_students(nrc: int, context: ApplicationContext=None, scope: Any=None):
    allowed = {'MY_COURSES_VIEW', 'TEACHER_CRUD', 'RUBRIC_VIEW'}
    if not allowed & set(scope.permissions):
        raise ApplicationError('forbidden', 'Sin permiso para ver estudiantes del curso')
    if scope.is_teacher and (not context.repositories.teacher_subject.has_subject(scope.user_id, nrc)):
        raise ApplicationError('not_found', 'Subject not found.')
    return context.repositories.student.list_by_subject(nrc)

def search_students(document: str | None=None, name: str | None=None, context: ApplicationContext=None, _=None):
    return context.repositories.student.search(document, name)

def update_student(student_id: int, payload: StudentUpdate, context: ApplicationContext=None, _=None):
    """Solo el coordinador. Puede cambiar name y program_id, nunca document_number."""
    try:
        student = context.repositories.student.update(student_id, payload.model_dump(exclude_unset=True))
        if not student:
            raise EntityNotFoundError('Student not found.')
        return student
    except EntityNotFoundError as exc:
        raise

async def delete_student(student_id: int, context: ApplicationContext=None, _=None):
    """Borra un estudiante. Antes borra en Assesment_MS sus rúbricas y evidencias;
    409 si hay periodos cerrados; 503 si el servicio no responde (paso 12)."""
    repo = context.repositories.student
    if not repo.get_by_id(student_id):
        raise ApplicationError('not_found', 'Student not found.')
    client = context.directory
    try:
        ok, closed = await client.delete_rubrics(student_id=student_id)
    except RemoteServiceError as exc:
        raise ApplicationError('unavailable', 'Servicio de valoraciones no disponible; no se borró nada') from exc
    if not ok:
        raise ApplicationError('conflict', f'Tiene valoraciones en periodos cerrados: {', '.join(closed)}')
    repo.delete(student_id)
    return None
