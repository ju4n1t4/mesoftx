from typing import Any, TypeVar

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.database.models import (
    CollegeModel,
    PeriodModel,
    PermissionModel,
    ProgramModel,
    RoleModel,
    RolePermissionModel,
    StudentModel,
    StudentSubjectModel,
    SubjectModel,
    TeacherSubjectModel,
    UserModel,
)

ModelT = TypeVar("ModelT")


class RepositoryError(Exception):
    pass


class EntityAlreadyExistsError(RepositoryError):
    pass


class EntityNotFoundError(RepositoryError):
    pass


class SqlAlchemyRepository:
    model: type[Any]
    order_by_column: str = "id"

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, entity_id: Any) -> Any | None:
        return self.db.get(self.model, entity_id)

    def list_all(self) -> list[Any]:
        order_column = getattr(self.model, self.order_by_column)
        return list(self.db.scalars(select(self.model).order_by(order_column)).all())

    def create(self, data: dict[str, Any]) -> Any:
        entity = self.model(**data)
        self.db.add(entity)
        return self._commit(entity)

    def update(self, entity_id: Any, data: dict[str, Any]) -> Any | None:
        entity = self.get_by_id(entity_id)
        if not entity:
            return None
        for key, value in data.items():
            setattr(entity, key, value)
        return self._commit(entity)

    def delete(self, entity_id: Any) -> bool:
        entity = self.get_by_id(entity_id)
        if not entity:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    def _commit(self, entity: Any) -> Any:
        try:
            self.db.commit()
            self.db.refresh(entity)
            return entity
        except IntegrityError as exc:
            self.db.rollback()
            raise EntityAlreadyExistsError("A record with the same unique data already exists.") from exc


class RoleRepository(SqlAlchemyRepository):
    model = RoleModel

    def get_by_name(self, name: str) -> RoleModel | None:
        return self.db.scalar(select(RoleModel).where(RoleModel.name == name))

    def count_users(self, role_id: int) -> int:
        return int(self.db.scalar(select(func.count()).select_from(UserModel).where(UserModel.role_id == role_id)) or 0)

    def set_permissions(self, role_id: int, permission_ids: list[int]) -> RoleModel | None:
        role = self.get_by_id(role_id)
        if not role:
            return None
        role.role_permissions = [
            RolePermissionModel(role_id=role_id, permission_id=pid) for pid in permission_ids
        ]
        return self._commit(role)

    def codes_for_role(self, role_id: int) -> list[str] | None:
        role = self.get_by_id(role_id)
        if not role:
            return None
        return [rp.permission.code for rp in role.role_permissions]


class PermissionRepository(SqlAlchemyRepository):
    model = PermissionModel

    def ids_for_codes(self, codes: list[str]) -> list[int]:
        rows = self.db.scalars(select(PermissionModel.id).where(PermissionModel.code.in_(codes))).all()
        return list(rows)


class PeriodRepository(SqlAlchemyRepository):
    model = PeriodModel


class CollegeRepository(SqlAlchemyRepository):
    model = CollegeModel


class ProgramRepository(SqlAlchemyRepository):
    model = ProgramModel


class SubjectRepository(SqlAlchemyRepository):
    model = SubjectModel
    order_by_column = "nrc"

    def list_by_program(self, program_id: str) -> list[SubjectModel]:
        return list(
            self.db.scalars(
                select(SubjectModel).where(SubjectModel.program_id == program_id).order_by(SubjectModel.nrc)
            ).all()
        )

    def programs_for_nrcs(self, nrcs: list[int]) -> dict[int, str]:
        """nrc -> program_id, en UNA sola consulta (batch para dashboards)."""
        if not nrcs:
            return {}
        rows = self.db.execute(
            select(SubjectModel.nrc, SubjectModel.program_id).where(SubjectModel.nrc.in_(nrcs))
        ).all()
        return {int(nrc): str(program_id) for nrc, program_id in rows}


class UserRepository(SqlAlchemyRepository):
    model = UserModel

    def get_by_email(self, email: str) -> UserModel | None:
        return self.db.scalar(select(UserModel).where(UserModel.email == email.lower()))

    def create_user(self, data: dict[str, Any]) -> UserModel:
        entity = UserModel(**data)
        self.db.add(entity)
        return self._commit(entity)

    def update_user(self, entity_id: int, data: dict[str, Any]) -> UserModel | None:
        entity = self.get_by_id(entity_id)
        if not entity:
            return None
        for key, value in data.items():
            setattr(entity, key, value)
        return self._commit(entity)

    def set_active(self, entity_id: int, active: bool) -> UserModel | None:
        return self.update(entity_id, {"active": active})


class StudentRepository(SqlAlchemyRepository):
    model = StudentModel

    def get_by_document(self, document_number: str) -> StudentModel | None:
        return self.db.scalar(select(StudentModel).where(StudentModel.document_number == document_number))

    def search(self, document: str | None, name: str | None) -> list[StudentModel]:
        stmt = select(StudentModel)
        if document:
            stmt = stmt.where(StudentModel.document_number.ilike(f"%{document}%"))
        if name:
            stmt = stmt.where(StudentModel.name.ilike(f"%{name}%"))
        return list(self.db.scalars(stmt.order_by(StudentModel.id)).all())

    def list_by_subject(self, nrc: int) -> list[StudentModel]:
        stmt = (
            select(StudentModel)
            .join(StudentSubjectModel, StudentSubjectModel.student_id == StudentModel.id)
            .where(StudentSubjectModel.subjects_id == nrc)
            .order_by(StudentModel.name)
        )
        return list(self.db.scalars(stmt).all())


class TeacherSubjectRepository(SqlAlchemyRepository):
    model = TeacherSubjectModel

    def has_subject(self, user_id: int, nrc: int) -> bool:
        row = self.db.scalar(
            select(TeacherSubjectModel.id).where(
                TeacherSubjectModel.user_id == user_id,
                TeacherSubjectModel.subjects_id == nrc,
            )
        )
        return row is not None

    def nrcs_for_user(self, user_id: int) -> list[int]:
        rows = self.db.scalars(
            select(TeacherSubjectModel.subjects_id).where(TeacherSubjectModel.user_id == user_id)
        ).all()
        return list(rows)

    def teachers_for_nrcs(self, nrcs: list[int]) -> dict[int, list[int]]:
        """nrc -> lista de user_id de los profesores que lo dictan, en UNA sola
        consulta (batch para el dashboard de avance por profesor)."""
        if not nrcs:
            return {}
        rows = self.db.execute(
            select(TeacherSubjectModel.subjects_id, TeacherSubjectModel.user_id).where(
                TeacherSubjectModel.subjects_id.in_(nrcs)
            )
        ).all()
        result: dict[int, list[int]] = {nrc: [] for nrc in nrcs}
        for nrc, user_id in rows:
            result[int(nrc)].append(int(user_id))
        return result

    def subjects_for_user(self, user_id: int) -> list[SubjectModel]:
        stmt = (
            select(SubjectModel)
            .join(TeacherSubjectModel, TeacherSubjectModel.subjects_id == SubjectModel.nrc)
            .where(TeacherSubjectModel.user_id == user_id)
            .order_by(SubjectModel.nrc)
        )
        return list(self.db.scalars(stmt).all())

    def assignments_for_user(self, user_id: int) -> list[dict]:
        """Asignaciones del profesor con el id de la asignación + datos de la materia.
        Permite listar y borrar por id (CRUD de la asignación en la UI)."""
        stmt = (
            select(
                TeacherSubjectModel.id,
                TeacherSubjectModel.user_id,
                SubjectModel.nrc,
                SubjectModel.materia_curso,
                SubjectModel.name,
                SubjectModel.periods_id,
                SubjectModel.program_id,
            )
            .join(SubjectModel, SubjectModel.nrc == TeacherSubjectModel.subjects_id)
            .where(TeacherSubjectModel.user_id == user_id)
            .order_by(SubjectModel.nrc)
        )
        return [
            {
                "id": row.id,
                "user_id": row.user_id,
                "subjects_id": row.nrc,
                "materia_curso": row.materia_curso,
                "name": row.name,
                "periods_id": row.periods_id,
                "program_id": row.program_id,
            }
            for row in self.db.execute(stmt).all()
        ]

    def pending_subjects_for_user(self, user_id: int) -> list[SubjectModel]:
        """NRC asignados al profesor sin ningún estudiante cargado (paso 13)."""
        enrolled = select(StudentSubjectModel.subjects_id).where(
            StudentSubjectModel.subjects_id == SubjectModel.nrc
        )
        stmt = (
            select(SubjectModel)
            .join(TeacherSubjectModel, TeacherSubjectModel.subjects_id == SubjectModel.nrc)
            .where(TeacherSubjectModel.user_id == user_id, ~enrolled.exists())
            .order_by(SubjectModel.nrc)
        )
        return list(self.db.scalars(stmt).all())


class EnrollmentRepository:
    """Matrículas estudiante-NRC (students_subjects)."""

    def __init__(self, db: Session):
        self.db = db

    def is_enrolled(self, student_id: int, nrc: int) -> bool:
        row = self.db.scalar(
            select(StudentSubjectModel.id).where(
                StudentSubjectModel.student_id == student_id,
                StudentSubjectModel.subjects_id == nrc,
            )
        )
        return row is not None

    def enroll(self, student_id: int, nrc: int) -> bool:
        """Devuelve True si creó la matrícula, False si ya existía."""
        if self.is_enrolled(student_id, nrc):
            return False
        self.db.add(StudentSubjectModel(student_id=student_id, subjects_id=nrc))
        try:
            self.db.commit()
            return True
        except IntegrityError:
            self.db.rollback()
            return False

    def counts_for_nrcs(self, nrcs: list[int]) -> dict[int, int]:
        if not nrcs:
            return {}
        rows = self.db.execute(
            select(StudentSubjectModel.subjects_id, func.count())
            .where(StudentSubjectModel.subjects_id.in_(nrcs))
            .group_by(StudentSubjectModel.subjects_id)
        ).all()
        counts = {nrc: 0 for nrc in nrcs}
        for nrc, total in rows:
            counts[int(nrc)] = int(total)
        return counts
