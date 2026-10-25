from typing import Any, Protocol
from app.application.ports.security import PasswordHasher, PasswordVerifier

class RoleRepositoryPort(Protocol):

    def get_by_name(self, name: Any) -> Any:
        ...

    def count_users(self, role_id: Any) -> Any:
        ...

    def set_permissions(self, role_id: Any, permission_ids: Any) -> Any:
        ...

    def codes_for_role(self, role_id: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class PermissionRepositoryPort(Protocol):

    def ids_for_codes(self, codes: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class PeriodRepositoryPort(Protocol):

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

class CollegeRepositoryPort(Protocol):

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class ProgramRepositoryPort(Protocol):

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class SubjectRepositoryPort(Protocol):

    def list_by_program(self, program_id: Any) -> Any:
        ...

    def programs_for_nrcs(self, nrcs: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class UserRepositoryPort(Protocol):

    def get_by_email(self, email: Any) -> Any:
        ...

    def create_user(self, data: Any) -> Any:
        ...

    def update_user(self, entity_id: Any, data: Any) -> Any:
        ...

    def set_active(self, entity_id: Any, active: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class StudentRepositoryPort(Protocol):

    def get_by_document(self, document_number: Any) -> Any:
        ...

    def search(self, document: Any, name: Any) -> Any:
        ...

    def list_by_subject(self, nrc: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class TeacherSubjectRepositoryPort(Protocol):

    def has_subject(self, user_id: Any, nrc: Any) -> Any:
        ...

    def nrcs_for_user(self, user_id: Any) -> Any:
        ...

    def teachers_for_nrcs(self, nrcs: Any) -> Any:
        ...

    def subjects_for_user(self, user_id: Any) -> Any:
        ...

    def assignments_for_user(self, user_id: Any) -> Any:
        ...

    def pending_subjects_for_user(self, user_id: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class EnrollmentRepositoryPort(Protocol):

    def is_enrolled(self, student_id: Any, nrc: Any) -> Any:
        ...

    def enroll(self, student_id: Any, nrc: Any) -> Any:
        ...

    def counts_for_nrcs(self, nrcs: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class RepositoryPorts(Protocol):
    role: RoleRepositoryPort
    permission: PermissionRepositoryPort
    period: PeriodRepositoryPort
    college: CollegeRepositoryPort
    program: ProgramRepositoryPort
    subject: SubjectRepositoryPort
    user: UserRepositoryPort
    student: StudentRepositoryPort
    teacher_subject: TeacherSubjectRepositoryPort
    enrollment: EnrollmentRepositoryPort

class DirectoryPort(Protocol):

    async def delete_rubrics(self, **filters: int) -> Any:
        ...

    async def delete_schedule_subjects(self, subjects_id: Any) -> Any:
        ...

    async def delete_so_schedule_by_period(self, period_id: Any) -> Any:
        ...

    async def delete_so_by_college(self, college_id: Any) -> Any:
        ...

class ApplicationContext(Protocol):
    repositories: RepositoryPorts
    directory: DirectoryPort
    hash_password: PasswordHasher
    verify_password: PasswordVerifier
