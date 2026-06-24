from dataclasses import dataclass


@dataclass(frozen=True)
class AssesmentCatalogEntity:
    id: int
    code: str | None = None
    description: str | None = None
