from dataclasses import dataclass


@dataclass(frozen=True)
class CatalogEntity:
    id: int
    name: str
    code: str | None = None
    description: str | None = None
