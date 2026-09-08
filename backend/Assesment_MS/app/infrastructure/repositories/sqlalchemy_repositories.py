from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.application.ports.repositories import InvalidReferenceError
from app.infrastructure.database.models import (
    AssesmentEvidenceModel,
    AssesmentResultModel,
    PerformanceEvaluationDetailModel,
    PerformanceEvaluationModel,
    PerformanceIndicatorDetailModel,
    PerformanceIndicatorModel,
    StudentOutcomeModel,
)


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

    def delete(self, entity_id: int) -> bool:
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
            raise InvalidReferenceError("Invalid referenced data or duplicated unique value.") from exc


class StudentOutcomeRepository(SqlAlchemyRepository):
    model = StudentOutcomeModel


class PerformanceIndicatorRepository(SqlAlchemyRepository):
    model = PerformanceIndicatorModel

    def delete(self, entity_id: int) -> bool:
        entity = self.get_by_id(entity_id)
        if not entity:
            return False
        self.db.execute(delete(PerformanceEvaluationDetailModel).where(PerformanceEvaluationDetailModel.performance_indicator_id == entity_id))
        self.db.execute(delete(PerformanceIndicatorDetailModel).where(PerformanceIndicatorDetailModel.performance_indicator_id == entity_id))
        self.db.delete(entity)
        self.db.commit()
        return True


class PerformanceIndicatorDetailRepository(SqlAlchemyRepository):
    model = PerformanceIndicatorDetailModel


class PerformanceEvaluationRepository(SqlAlchemyRepository):
    model = PerformanceEvaluationModel


class PerformanceEvaluationDetailRepository(SqlAlchemyRepository):
    model = PerformanceEvaluationDetailModel


class AssesmentEvidenceRepository(SqlAlchemyRepository):
    model = AssesmentEvidenceModel


class AssesmentResultRepository(SqlAlchemyRepository):
    model = AssesmentResultModel


class AssesmentEvidenceWithResultsRepository(AssesmentEvidenceRepository):
    def create_with_results(self, evidence_data: dict[str, Any], results_data: list[dict[str, Any]]) -> tuple[Any, list[Any]]:
        evidence = AssesmentEvidenceModel(**evidence_data)
        self.db.add(evidence)
        try:
            self.db.flush()
            results = [
                AssesmentResultModel(**{**result_data, "assesment_evidence_id": evidence.id})
                for result_data in results_data
            ]
            self.db.add_all(results)
            self.db.commit()
            self.db.refresh(evidence)
            for result in results:
                self.db.refresh(result)
            return evidence, results
        except IntegrityError as exc:
            self.db.rollback()
            raise InvalidReferenceError("Invalid referenced data for assesment evidence or results.") from exc
