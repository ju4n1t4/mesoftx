from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    detail: str


class StudentOutcomeCreate(BaseModel):
    code: str = Field(..., max_length=255)
    description: str | None = None


class StudentOutcomeUpdate(BaseModel):
    code: str | None = Field(default=None, max_length=255)
    description: str | None = None


class StudentOutcomeResponse(StudentOutcomeCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PerformanceIndicatorCreate(BaseModel):
    code: str = Field(..., max_length=255)
    name: str | None = None


class PerformanceIndicatorUpdate(BaseModel):
    code: str | None = Field(default=None, max_length=255)
    name: str | None = None


class PerformanceIndicatorResponse(PerformanceIndicatorCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PerformanceIndicatorDetailCreate(BaseModel):
    performance_indicator_id: int = Field(..., gt=0)
    student_outcome_id: int = Field(..., gt=0)
    description: str = Field(..., min_length=1)


class PerformanceIndicatorDetailUpdate(BaseModel):
    performance_indicator_id: int | None = Field(default=None, gt=0)
    student_outcome_id: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, min_length=1)


class PerformanceIndicatorDetailResponse(PerformanceIndicatorDetailCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PerformanceEvaluationCreate(BaseModel):
    evaluation_value: str = Field(..., max_length=255)


class PerformanceEvaluationUpdate(BaseModel):
    evaluation_value: str | None = Field(default=None, max_length=255)


class PerformanceEvaluationResponse(PerformanceEvaluationCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PerformanceEvaluationDetailCreate(BaseModel):
    performance_evaluation_id: int = Field(..., gt=0)
    performance_indicator_id: int = Field(..., gt=0)
    student_outcome_id: int = Field(..., gt=0)
    description: str = Field(..., min_length=1)


class PerformanceEvaluationDetailUpdate(BaseModel):
    performance_evaluation_id: int | None = Field(default=None, gt=0)
    performance_indicator_id: int | None = Field(default=None, gt=0)
    student_outcome_id: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, min_length=1)


class PerformanceEvaluationDetailResponse(PerformanceEvaluationDetailCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AssesmentEvidenceCreate(BaseModel):
    evidence_name_doc: str = Field(..., min_length=1)
    student_code: str = Field(..., max_length=25)
    student_outcome_id: int = Field(..., gt=0)


class AssesmentEvidenceUpdate(BaseModel):
    evidence_name_doc: str | None = Field(default=None, min_length=1)
    student_code: str | None = Field(default=None, max_length=25)
    student_outcome_id: int | None = Field(default=None, gt=0)


class AssesmentEvidenceResponse(AssesmentEvidenceCreate):
    id: int
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class AssesmentResultCreate(BaseModel):
    subject_code: str = Field(..., max_length=25)
    assesment_evidence_id: int = Field(..., gt=0)
    student_outcome_id: int = Field(..., gt=0)
    performance_evaluation_detail_id: int = Field(..., gt=0)


class AssesmentResultUpdate(BaseModel):
    subject_code: str | None = Field(default=None, max_length=25)
    assesment_evidence_id: int | None = Field(default=None, gt=0)
    student_outcome_id: int | None = Field(default=None, gt=0)
    performance_evaluation_detail_id: int | None = Field(default=None, gt=0)


class AssesmentResultResponse(AssesmentResultCreate):
    id: int
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class AssesmentResultNestedCreate(BaseModel):
    subject_code: str = Field(..., max_length=25)
    student_outcome_id: int = Field(..., gt=0)
    performance_evaluation_detail_id: int = Field(..., gt=0)


class AssesmentEvidenceWithResultsCreate(BaseModel):
    evidence_name_doc: str = Field(..., min_length=1)
    student_code: str = Field(..., max_length=25)
    student_outcome_id: int = Field(..., gt=0)
    results: list[AssesmentResultNestedCreate] = Field(..., min_length=1)


class AssesmentEvidenceWithResultsResponse(BaseModel):
    evidence: AssesmentEvidenceResponse
    results: list[AssesmentResultResponse]
