from typing import Any

from app.infrastructure.repositories.sqlalchemy_repositories import EntityNotFoundError


class CatalogService:
    def __init__(self, repository: Any):
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
