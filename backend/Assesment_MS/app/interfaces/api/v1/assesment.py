from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.application.services.catalog_service import CatalogService
from app.application.services.evidence_service import EvidenceService
from app.infrastructure.repositories.sqlalchemy_repositories import (
    AssesmentEvidenceRepository,
    AssesmentEvidenceWithResultsRepository,
    AssesmentResultRepository,
    EntityNotFoundError,
    InvalidReferenceError,
    PerformanceEvaluationDetailRepository,
    PerformanceEvaluationRepository,
    PerformanceIndicatorDetailRepository,
    PerformanceIndicatorRepository,
    StudentOutcomeRepository,
)
from app.interfaces.api.v1.dependencies import db_session
from app.interfaces.api.v1.error_handlers import map_repository_error
from app.interfaces.api.v1.schemas import (
    AssesmentEvidenceCreate,
    AssesmentEvidenceResponse,
    AssesmentEvidenceUpdate,
    AssesmentEvidenceWithResultsCreate,
    AssesmentEvidenceWithResultsResponse,
    AssesmentResultCreate,
    AssesmentResultResponse,
    AssesmentResultUpdate,
    PerformanceEvaluationCreate,
    PerformanceEvaluationDetailCreate,
    PerformanceEvaluationDetailResponse,
    PerformanceEvaluationDetailUpdate,
    PerformanceEvaluationResponse,
    PerformanceEvaluationUpdate,
    PerformanceIndicatorCreate,
    PerformanceIndicatorDetailCreate,
    PerformanceIndicatorDetailResponse,
    PerformanceIndicatorDetailUpdate,
    PerformanceIndicatorResponse,
    PerformanceIndicatorUpdate,
    StudentOutcomeCreate,
    StudentOutcomeResponse,
    StudentOutcomeUpdate,
)

router = APIRouter(tags=["Assesment"])


def _service(repository_class: type[Any], db: Session) -> CatalogService:
    return CatalogService(repository_class(db))


@router.get("/student-outcomes", response_model=list[StudentOutcomeResponse])
def list_student_outcomes(db: Session = Depends(db_session)):
    return _service(StudentOutcomeRepository, db).list()


@router.post("/student-outcomes", response_model=StudentOutcomeResponse, status_code=status.HTTP_201_CREATED)
def create_student_outcome(payload: StudentOutcomeCreate, db: Session = Depends(db_session)):
    try:
        return _service(StudentOutcomeRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/student-outcomes/{entity_id}", response_model=StudentOutcomeResponse)
def update_student_outcome(entity_id: int, payload: StudentOutcomeUpdate, db: Session = Depends(db_session)):
    try:
        return _service(StudentOutcomeRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/performance-indicators", response_model=list[PerformanceIndicatorResponse])
def list_performance_indicators(db: Session = Depends(db_session)):
    return _service(PerformanceIndicatorRepository, db).list()


@router.post("/performance-indicators", response_model=PerformanceIndicatorResponse, status_code=status.HTTP_201_CREATED)
def create_performance_indicator(payload: PerformanceIndicatorCreate, db: Session = Depends(db_session)):
    try:
        return _service(PerformanceIndicatorRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/performance-indicators/{entity_id}", response_model=PerformanceIndicatorResponse)
def update_performance_indicator(entity_id: int, payload: PerformanceIndicatorUpdate, db: Session = Depends(db_session)):
    try:
        return _service(PerformanceIndicatorRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/performance-indicator-details", response_model=list[PerformanceIndicatorDetailResponse])
def list_performance_indicator_details(db: Session = Depends(db_session)):
    return _service(PerformanceIndicatorDetailRepository, db).list()


@router.post(
    "/performance-indicator-details",
    response_model=PerformanceIndicatorDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_performance_indicator_detail(payload: PerformanceIndicatorDetailCreate, db: Session = Depends(db_session)):
    try:
        return _service(PerformanceIndicatorDetailRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/performance-indicator-details/{entity_id}", response_model=PerformanceIndicatorDetailResponse)
def update_performance_indicator_detail(
    entity_id: int,
    payload: PerformanceIndicatorDetailUpdate,
    db: Session = Depends(db_session),
):
    try:
        return _service(PerformanceIndicatorDetailRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/performance-evaluations", response_model=list[PerformanceEvaluationResponse])
def list_performance_evaluations(db: Session = Depends(db_session)):
    return _service(PerformanceEvaluationRepository, db).list()


@router.post("/performance-evaluations", response_model=PerformanceEvaluationResponse, status_code=status.HTTP_201_CREATED)
def create_performance_evaluation(payload: PerformanceEvaluationCreate, db: Session = Depends(db_session)):
    try:
        return _service(PerformanceEvaluationRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/performance-evaluations/{entity_id}", response_model=PerformanceEvaluationResponse)
def update_performance_evaluation(entity_id: int, payload: PerformanceEvaluationUpdate, db: Session = Depends(db_session)):
    try:
        return _service(PerformanceEvaluationRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/performance-evaluation-details", response_model=list[PerformanceEvaluationDetailResponse])
def list_performance_evaluation_details(db: Session = Depends(db_session)):
    return _service(PerformanceEvaluationDetailRepository, db).list()


@router.post(
    "/performance-evaluation-details",
    response_model=PerformanceEvaluationDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_performance_evaluation_detail(payload: PerformanceEvaluationDetailCreate, db: Session = Depends(db_session)):
    try:
        return _service(PerformanceEvaluationDetailRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/performance-evaluation-details/{entity_id}", response_model=PerformanceEvaluationDetailResponse)
def update_performance_evaluation_detail(
    entity_id: int,
    payload: PerformanceEvaluationDetailUpdate,
    db: Session = Depends(db_session),
):
    try:
        return _service(PerformanceEvaluationDetailRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/assesment-evidence", response_model=list[AssesmentEvidenceResponse])
def list_assesment_evidence(db: Session = Depends(db_session)):
    return _service(AssesmentEvidenceRepository, db).list()


@router.post("/assesment-evidence", response_model=AssesmentEvidenceResponse, status_code=status.HTTP_201_CREATED)
def create_assesment_evidence(payload: AssesmentEvidenceCreate, db: Session = Depends(db_session)):
    try:
        return _service(AssesmentEvidenceRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.post(
    "/assesment-evidence/with-results",
    response_model=AssesmentEvidenceWithResultsResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_assesment_evidence_with_results(payload: AssesmentEvidenceWithResultsCreate, db: Session = Depends(db_session)):
    try:
        evidence_data = payload.model_dump(exclude={"results"})
        results_data = [result.model_dump() for result in payload.results]
        evidence, results = EvidenceService(AssesmentEvidenceWithResultsRepository(db)).create_with_results(
            evidence_data,
            results_data,
        )
        return AssesmentEvidenceWithResultsResponse(evidence=evidence, results=results)
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/assesment-evidence/{entity_id}", response_model=AssesmentEvidenceResponse)
def update_assesment_evidence(entity_id: int, payload: AssesmentEvidenceUpdate, db: Session = Depends(db_session)):
    try:
        return _service(AssesmentEvidenceRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc


@router.get("/assesment-results", response_model=list[AssesmentResultResponse])
def list_assesment_results(db: Session = Depends(db_session)):
    return _service(AssesmentResultRepository, db).list()


@router.post("/assesment-results", response_model=AssesmentResultResponse, status_code=status.HTTP_201_CREATED)
def create_assesment_result(payload: AssesmentResultCreate, db: Session = Depends(db_session)):
    try:
        return _service(AssesmentResultRepository, db).create(payload.model_dump())
    except InvalidReferenceError as exc:
        raise map_repository_error(exc) from exc


@router.put("/assesment-results/{entity_id}", response_model=AssesmentResultResponse)
def update_assesment_result(entity_id: int, payload: AssesmentResultUpdate, db: Session = Depends(db_session)):
    try:
        return _service(AssesmentResultRepository, db).update(entity_id, payload.model_dump(exclude_unset=True))
    except (EntityNotFoundError, InvalidReferenceError) as exc:
        raise map_repository_error(exc) from exc
