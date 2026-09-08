from typing import Any, Protocol


class RepositoryError(Exception):
    pass


class EntityAlreadyExistsError(RepositoryError):
    pass


class EntityNotFoundError(RepositoryError):
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


class UserRepositoryPort(BaseRepositoryPort, Protocol):
    def get_by_email(self, email: str) -> Any | None:
        ...

    def create_user(self, data: dict[str, Any], subject_ids: list[int]) -> Any:
        ...

    def update_user(self, entity_id: int, data: dict[str, Any], subject_ids: list[int] | None) -> Any | None:
        ...

    def set_active(self, entity_id: int, active: bool) -> Any | None:
        ...
