from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.database.models import (
    AcademicPeriodModel,
    CareerModel,
    FacultyModel,
    PeriodModel,
    RoleModel,
    SubjectModel,
    UserModel,
    UserSubjectModel,
    YearModel,
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

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, entity_id: int) -> Any | None:
        return self.db.get(self.model, entity_id)

    def list_all(self) -> list[Any]:
        return list(self.db.scalars(select(self.model).order_by(self.model.id)).all())

    def create(self, data: dict[str, Any]) -> Any:
        entity = self.model(**data)
        self.db.add(entity)
        return self._commit(entity)

    def update(self, entity_id: int, data: dict[str, Any]) -> Any | None:
        entity = self.get_by_id(entity_id)
        if not entity:
            return None
        for key, value in data.items():
            setattr(entity, key, value)
        return self._commit(entity)

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


class YearRepository(SqlAlchemyRepository):
    model = YearModel


class PeriodRepository(SqlAlchemyRepository):
    model = PeriodModel


class AcademicPeriodRepository(SqlAlchemyRepository):
    model = AcademicPeriodModel


class FacultyRepository(SqlAlchemyRepository):
    model = FacultyModel


class CareerRepository(SqlAlchemyRepository):
    model = CareerModel


class SubjectRepository(SqlAlchemyRepository):
    model = SubjectModel


class UserRepository(SqlAlchemyRepository):
    model = UserModel

    def get_by_email(self, email: str) -> UserModel | None:
        return self.db.scalar(select(UserModel).where(UserModel.email == email.lower()))

    def create_user(self, data: dict[str, Any], subject_ids: list[int]) -> UserModel:
        entity = UserModel(**data)
        entity.user_subjects = [UserSubjectModel(subject_id=subject_id) for subject_id in subject_ids]
        self.db.add(entity)
        return self._commit(entity)

    def update_user(self, entity_id: int, data: dict[str, Any], subject_ids: list[int] | None) -> UserModel | None:
        entity = self.get_by_id(entity_id)
        if not entity:
            return None
        for key, value in data.items():
            setattr(entity, key, value)
        if subject_ids is not None:
            entity.user_subjects = [UserSubjectModel(subject_id=subject_id) for subject_id in subject_ids]
        return self._commit(entity)

    def set_active(self, entity_id: int, active: bool) -> UserModel | None:
        return self.update(entity_id, {"active": active})
