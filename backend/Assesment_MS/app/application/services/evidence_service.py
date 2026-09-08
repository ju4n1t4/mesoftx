from typing import Any

from app.application.ports.repositories import AssesmentEvidenceWithResultsRepositoryPort


class EvidenceService:
    def __init__(self, repository: AssesmentEvidenceWithResultsRepositoryPort):
        self.repository = repository

    def create_with_results(self, evidence_data: dict[str, Any], results_data: list[dict[str, Any]]) -> tuple[Any, list[Any]]:
        return self.repository.create_with_results(evidence_data, results_data)
