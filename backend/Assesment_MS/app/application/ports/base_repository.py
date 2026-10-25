from typing import Any, Protocol


class BaseRepository(Protocol):
    def get_by_id(self, entity_id: int) -> Any | None:
        ...

    def list_all(self) -> list[Any]:
        ...

    def create(self, data: dict[str, Any]) -> Any:
        ...

    def update(self, entity_id: int, data: dict[str, Any]) -> Any | None:
        ...
