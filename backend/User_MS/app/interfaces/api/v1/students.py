from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.repositories.sqlalchemy_repositories import (
    EntityNotFoundError,
    EnrollmentRepository,
    StudentRepository,
    SubjectRepository,
    TeacherSubjectRepository,
)
from app.interfaces.api.v1.dependencies import db_session, require_permission
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import (
    StudentResponse,
    StudentUpdate,
    StudentUploadRequest,
    StudentUploadResult,
)

router = APIRouter(tags=["Students"])


@router.post("/subjects/{nrc}/students", response_model=StudentUploadResult, status_code=status.HTTP_201_CREATED)
def upload_students(
    nrc: int,
    payload: StudentUploadRequest,
    db: Session = Depends(db_session),
    current_user=Depends(require_permission("STUDENT_UPLOAD")),
):
    """Carga la lista del curso. Deduplica por document_number; el primero que
    lo cargó gana (paso 13)."""
    subject = SubjectRepository(db).get_by_id(nrc)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    # El profesor debe tener ese NRC asignado.
    if not TeacherSubjectRepository(db).has_subject(current_user.id, nrc):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ese curso no está asignado a usted")

    students_repo = StudentRepository(db)
    enroll_repo = EnrollmentRepository(db)
    created = already = enrolled = 0

    for row in payload.students:
        student = students_repo.get_by_document(row.document_number)
        if student is None:
            student = students_repo.create(
                {
                    "document_number": row.document_number,
                    "name": row.name,
                    "program_id": subject.program_id,
                    "created_by": current_user.id,
                }
            )
            created += 1
        else:
            # Ya existía: se reutiliza sin modificar (el primero gana).
            already += 1
        if enroll_repo.enroll(student.id, nrc):
            enrolled += 1

    return StudentUploadResult(created=created, already_existed=already, enrolled=enrolled)


@router.get("/subjects/{nrc}/students", response_model=list[StudentResponse])
def list_subject_students(
    nrc: int,
    db: Session = Depends(db_session),
    current_user=Depends(require_permission("MY_COURSES_VIEW")),
):
    # El profesor solo ve estudiantes de sus NRC; coordinador/auditor ven todo.
    perms = getattr(current_user, "permissions", [])
    if "TEACHER_CRUD" not in perms and "RUBRIC_VIEW" not in perms:
        if not TeacherSubjectRepository(db).has_subject(current_user.id, nrc):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    return StudentRepository(db).list_by_subject(nrc)


@router.get("/students", response_model=list[StudentResponse])
def search_students(
    document: str | None = None,
    name: str | None = None,
    db: Session = Depends(db_session),
    _=Depends(require_permission("TEACHER_CRUD")),
):
    return StudentRepository(db).search(document, name)


@router.put("/students/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(db_session),
    _=Depends(require_permission("TEACHER_CRUD")),
):
    """Solo el coordinador. Puede cambiar name y program_id, nunca document_number."""
    try:
        student = StudentRepository(db).update(student_id, payload.model_dump(exclude_unset=True))
        if not student:
            raise EntityNotFoundError("Student not found.")
        return student
    except EntityNotFoundError as exc:
        raise map_repository_error(exc) from exc
