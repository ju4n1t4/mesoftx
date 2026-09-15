from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ErrorResponse(BaseModel):
    detail: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class RoleCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None


class RoleResponse(RoleCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    document_number: str = Field(..., max_length=25)
    name: str = Field(..., max_length=255)
    email: str | None = Field(default=None, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role_id: int = Field(..., gt=0)
    program_id: str | None = Field(default=None, max_length=3)
    accredited: bool | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value else value


class UserUpdate(BaseModel):
    document_number: str | None = Field(default=None, max_length=25)
    name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    active: bool | None = None
    role_id: int | None = Field(default=None, gt=0)
    program_id: str | None = Field(default=None, max_length=3)
    accredited: bool | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value else value


class UserResponse(BaseModel):
    id: int
    document_number: str
    name: str
    email: str | None = None
    active: bool
    role_id: int
    program_id: str | None = None
    accredited: bool | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, user: Any) -> "UserResponse":
        return cls(
            id=user.id,
            document_number=user.document_number,
            name=user.name,
            email=user.email,
            active=user.active,
            role_id=user.role_id,
            program_id=user.program_id,
            accredited=user.accredited,
            created_at=user.created_at,
        )


# ── Permisos ────────────────────────────────────────────────
class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str | None = None
    model_config = ConfigDict(from_attributes=True)


class RolePermissionsUpdate(BaseModel):
    permission_codes: list[str] = Field(default_factory=list)


# ── College (facultad) ──────────────────────────────────────
class CollegeCreate(BaseModel):
    id: str = Field(..., max_length=3)
    name: str = Field(..., max_length=255)
    active: bool = True


class CollegeUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    active: bool | None = None


class CollegeResponse(CollegeCreate):
    model_config = ConfigDict(from_attributes=True)


# ── Program (programa académico) ────────────────────────────
class ProgramCreate(BaseModel):
    id: str = Field(..., max_length=3)
    name: str = Field(..., max_length=255)
    college_id: str = Field(..., max_length=3)
    accredited: bool = False
    accreditation_end_year: int | None = Field(default=None, ge=1900, le=2200)
    active: bool = True


class ProgramUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    college_id: str | None = Field(default=None, max_length=3)
    accredited: bool | None = None
    accreditation_end_year: int | None = Field(default=None, ge=1900, le=2200)
    active: bool | None = None


class ProgramResponse(ProgramCreate):
    model_config = ConfigDict(from_attributes=True)


# ── Periodo ─────────────────────────────────────────────────
class PeriodCreate(BaseModel):
    code: str = Field(..., max_length=6)


class PeriodUpdate(BaseModel):
    code: str | None = Field(default=None, max_length=6)


class PeriodResponse(BaseModel):
    id: int
    code: str
    model_config = ConfigDict(from_attributes=True)


# ── Materia (subject / NRC) ─────────────────────────────────
class SubjectCreate(BaseModel):
    nrc: int = Field(..., gt=0)
    materia_curso: str = Field(..., max_length=25)
    name: str = Field(..., max_length=255)
    periods_id: int = Field(..., gt=0)
    program_id: str = Field(..., max_length=3)


class SubjectUpdate(BaseModel):
    materia_curso: str | None = Field(default=None, max_length=25)
    name: str | None = Field(default=None, max_length=255)
    periods_id: int | None = Field(default=None, gt=0)
    program_id: str | None = Field(default=None, max_length=3)


class SubjectResponse(SubjectCreate):
    model_config = ConfigDict(from_attributes=True)


# ── Asignación NRC → profesor ───────────────────────────────
class TeacherSubjectCreate(BaseModel):
    user_id: int = Field(..., gt=0)
    subjects_id: int = Field(..., gt=0)


class TeacherSubjectResponse(BaseModel):
    id: int
    user_id: int
    subjects_id: int
    assigned_by: int | None = None
    model_config = ConfigDict(from_attributes=True)


class TeacherSubjectDetail(BaseModel):
    """Asignación + datos de la materia, para listar y poder borrar por id (CRUD UI)."""
    id: int                # id de la asignación (teacher_subjects.id) -> para DELETE
    user_id: int
    subjects_id: int       # = nrc
    materia_curso: str
    name: str
    periods_id: int
    program_id: str


# ── Estudiantes ─────────────────────────────────────────────
class StudentResponse(BaseModel):
    id: int
    document_number: str
    name: str
    program_id: str
    created_by: int | None = None
    model_config = ConfigDict(from_attributes=True)


class StudentUpdate(BaseModel):
    """El coordinador puede corregir name y program_id, nunca document_number."""
    name: str | None = Field(default=None, max_length=255)
    program_id: str | None = Field(default=None, max_length=3)


class StudentRow(BaseModel):
    document_number: str = Field(..., max_length=25)
    name: str = Field(..., max_length=255)


class StudentUploadRequest(BaseModel):
    students: list[StudentRow] = Field(..., min_length=1)


class StudentUploadResult(BaseModel):
    created: int
    already_existed: int
    enrolled: int


# ── Batch interno (dashboards) ──────────────────────────────
class SubjectsCountRequest(BaseModel):
    nrcs: list[int] = Field(default_factory=list)
