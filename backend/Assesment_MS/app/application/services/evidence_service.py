from typing import Any

from app.infrastructure.repositories.sqlalchemy_repositories import AssesmentEvidenceWithResultsRepository


class EvidenceService:
    def __init__(self, repository: AssesmentEvidenceWithResultsRepository):
        self.repository = repository

    def create_with_results(self, evidence_data: dict[str, Any], results_data: list[dict[str, Any]]) -> tuple[Any, list[Any]]:
        return self.repository.create_with_results(evidence_data, results_data)
