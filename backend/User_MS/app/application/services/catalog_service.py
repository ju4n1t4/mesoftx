from typing import Any

from app.application.ports.repositories import (
    BaseRepositoryPort,
    EntityNotFoundError,
)


PERIOD_NAMES = {
    "10": "1er SEM PREGRAD Y PREUN",
    "20": "2do SEM PREGRAD Y PREUN",
}


class CatalogService:
    def __init__(self, repository: BaseRepositoryPort):
        self.repository = repository

    def get(self, entity_id: int) -> Any:
        entity = self.repository.get_by_id(entity_id)
        if not entity:
            raise EntityNotFoundError("Record not found.")
        return entity

    def list(self) -> list[Any]:
        return self.repository.list_all()

    def create(self, data: dict[str, Any]) -> Any:
        return self.repository.create(data)

    def update(self, entity_id: int, data: dict[str, Any]) -> Any:
        entity = self.repository.update(entity_id, data)
        if not entity:
            raise EntityNotFoundError("Record not found.")
        return entity

    def delete(self, entity_id: int) -> None:
        deleted = self.repository.delete(entity_id)
        if not deleted:
            raise EntityNotFoundError("Record not found.")


class AcademicPeriodService(CatalogService):
    def __init__(
        self,
        repository: BaseRepositoryPort,
        period_repository: BaseRepositoryPort,
        year_repository: BaseRepositoryPort,
    ):
        super().__init__(repository)
        self.period_repository = period_repository
        self.year_repository = year_repository

    def create(self, data: dict[str, Any]) -> Any:
        data = self._complete_academic_period_data(data)
        return self.repository.create(data)

    def update(self, entity_id: int, data: dict[str, Any]) -> Any:
        current = self.get(entity_id)
        merged = {
            "period_id": data.get("period_id", current.period_id),
            "year_id": data.get("year_id", current.year_id),
            "name": data.get("name"),
            "code": data.get("code"),
        }
        completed = self._complete_academic_period_data(merged)
        if data.get("name") is None and data.get("period_id") is None:
            completed["name"] = current.name
        if data.get("code") is None and data.get("period_id") is None and data.get("year_id") is None:
            completed["code"] = current.code
        update_data = {**data, "name": completed["name"], "code": completed["code"]}
        return super().update(entity_id, update_data)

    def _complete_academic_period_data(self, data: dict[str, Any]) -> dict[str, Any]:
        period = self.period_repository.get_by_id(data["period_id"])
        year = self.year_repository.get_by_id(data["year_id"])
        if not period or not year:
            raise EntityNotFoundError("Year or period not found.")

        period_value = str(period.period).strip()
        completed = dict(data)
        completed["name"] = completed.get("name") or PERIOD_NAMES.get(period_value, f"PERIODO {period_value}")
        completed["code"] = completed.get("code") or f"{year.year}{period_value}"
        return completed
