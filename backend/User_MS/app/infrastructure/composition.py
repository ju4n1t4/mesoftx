"""Composition root: concrete adapters are assembled here, outside application."""
from types import SimpleNamespace
from app.infrastructure.repositories import sqlalchemy_repositories as repositories
from app.infrastructure.clients.assesment_ms_client import AssesmentMsClient
from app.infrastructure.security.password_service import hash_password, verify_password

def build_context(db):
    return SimpleNamespace(
        repositories=SimpleNamespace(
            role=repositories.RoleRepository(db),
            permission=repositories.PermissionRepository(db),
            period=repositories.PeriodRepository(db),
            college=repositories.CollegeRepository(db),
            program=repositories.ProgramRepository(db),
            subject=repositories.SubjectRepository(db),
            user=repositories.UserRepository(db),
            student=repositories.StudentRepository(db),
            teacher_subject=repositories.TeacherSubjectRepository(db),
            enrollment=repositories.EnrollmentRepository(db),
        ),
        directory=AssesmentMsClient(),
        hash_password=hash_password, verify_password=verify_password,
    )
