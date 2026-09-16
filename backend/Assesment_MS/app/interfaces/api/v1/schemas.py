from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    detail: str


# ── Student Outcome ─────────────────────────────────────────
class StudentOutcomeCreate(BaseModel):
    id: str = Field(..., max_length=5)
    description: str = Field(..., max_length=255)
    college_id: str = Field(..., max_length=3)


class StudentOutcomeUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=255)
    college_id: str | None = Field(default=None, max_length=3)


class StudentOutcomeResponse(StudentOutcomeCreate):
    model_config = ConfigDict(from_attributes=True)


# ── Indicador de desempeño ──────────────────────────────────
class PerformanceCreate(BaseModel):
    id: str = Field(..., max_length=20)
    description: str = Field(..., max_length=255)
    so_id: str = Field(..., max_length=5)


class PerformanceUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=255)
    so_id: str | None = Field(default=None, max_length=5)


class PerformanceResponse(BaseModel):
    id: str = Field(..., max_length=20)
    code: str = Field(..., max_length=20)
    description: str = Field(..., max_length=255)
    so_id: str = Field(..., max_length=5)
    model_config = ConfigDict(from_attributes=True)


# ── Nivel ───────────────────────────────────────────────────
class LevelCreate(BaseModel):
    id: str = Field(..., max_length=100)
    description: str = Field(..., max_length=255)
    rank: int = Field(..., ge=1, le=4)
    performance_id: str = Field(..., max_length=20)


class LevelUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=255)
    rank: int | None = Field(default=None, ge=1, le=4)


class LevelResponse(LevelCreate):
    model_config = ConfigDict(from_attributes=True)


# ── Programación de SO ──────────────────────────────────────
class SoScheduleCreate(BaseModel):
    so_id: str = Field(..., max_length=5)
    period_id: int = Field(..., gt=0)
    status: str = Field(default="PLANIFICADO", max_length=20)


class SoScheduleUpdate(BaseModel):
    period_id: int | None = Field(default=None, gt=0)
    status: str | None = Field(default=None, max_length=20)


class SoScheduleResponse(BaseModel):
    id: int
    so_id: str
    period_id: int
    coordinator_user_id: int
    status: str
    created_at: datetime | None = None
    updated_by: int | None = None
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class ScheduleSubjectsUpdate(BaseModel):
    nrcs: list[int] = Field(default_factory=list)


class ScheduleStatusUpdate(BaseModel):
    status: str = Field(..., max_length=20)


class AssessmentToDoResponse(BaseModel):
    schedule_id: int
    so_id: str
    description: str
    nrc: int
    period_id: int


# ── Rúbrica ─────────────────────────────────────────────────
class RubricCreate(BaseModel):
    schedule_id: int = Field(..., gt=0)
    student_id: int = Field(..., gt=0)
    subjects_id: int = Field(..., gt=0)
    performance_id: str = Field(..., max_length=20)
    level_id: str = Field(..., max_length=100)
    evidence_id: int | None = Field(default=None, gt=0)


class RubricUpdate(BaseModel):
    performance_id: str | None = Field(default=None, max_length=20)
    level_id: str | None = Field(default=None, max_length=100)
    evidence_id: int | None = Field(default=None, gt=0)


class RubricResponse(BaseModel):
    id: int
    schedule_id: int
    evaluator_user_id: int
    student_id: int
    subjects_id: int
    performance_id: str
    level_id: str
    evidence_id: int | None = None
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


# ── Evidencia (futura) ──────────────────────────────────────
class EvidenceCreate(BaseModel):
    schedule_id: int = Field(..., gt=0)
    subjects_id: int = Field(..., gt=0)
    student_id: int = Field(..., gt=0)
    name: str = Field(..., max_length=255)
    file_url: str = Field(..., max_length=500)
    mime_type: str | None = Field(default=None, max_length=100)


class EvidenceResponse(BaseModel):
    id: int
    schedule_id: int
    subjects_id: int
    student_id: int
    name: str
    file_url: str
    mime_type: str | None = None
    uploaded_by: int
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


# ── Dashboards ──────────────────────────────────────────────
class ProgramProgressItem(BaseModel):
    program_id: str
    expected: int
    done: int


class DashboardProgramResponse(BaseModel):
    period_id: int
    expected: int                       # total del periodo (se conserva)
    done: int                           # total del periodo (se conserva)
    items: list[ProgramProgressItem]    # desglose por programa


class SoProgressItem(BaseModel):
    so_id: str
    expected: int
    done: int


class DashboardSoResponse(BaseModel):
    period_id: int
    expected: int                       # total del periodo (se conserva)
    items: list[SoProgressItem]


class TeacherProgressItem(BaseModel):
    evaluator_user_id: int
    expected: int
    done: int


class DashboardTeacherResponse(BaseModel):
    period_id: int
    expected: int                       # total del periodo
    done: int                           # total del periodo
    items: list[TeacherProgressItem]


class ChartLevelItem(BaseModel):
    performance_id: str
    rank: int
    level_id: str
    total: int


class IndicatorsChartResponse(BaseModel):
    period_id: int
    items: list[ChartLevelItem]
