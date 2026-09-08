from typing import Any, Protocol


class RepositoryError(Exception):
    pass


class EntityAlreadyExistsError(RepositoryError):
    pass


class EntityNotFoundError(RepositoryError):
    pass


class InvalidReferenceError(RepositoryError):
    pass


class BaseRepositoryPort(Protocol):
    def get_by_id(self, entity_id: int) -> Any | None:
        ...

    def list_all(self) -> list[Any]:
        ...

    def create(self, data: dict[str, Any]) -> Any:
        ...

    def update(self, entity_id: int, data: dict[str, Any]) -> Any | None:
        ...


class AssesmentEvidenceWithResultsRepositoryPort(BaseRepositoryPort, Protocol):
    def create_with_results(self, evidence_data: dict[str, Any], results_data: list[dict[str, Any]]) -> tuple[Any, list[Any]]:
        ...
