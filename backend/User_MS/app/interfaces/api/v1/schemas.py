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


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., min_length=1)


class RoleCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None


class RoleResponse(RoleCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class YearCreate(BaseModel):
    year: int = Field(..., ge=1900, le=2200)


class YearUpdate(BaseModel):
    year: int | None = Field(default=None, ge=1900, le=2200)


class YearResponse(YearCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PeriodCreate(BaseModel):
    period: str = Field(..., max_length=255)


class PeriodUpdate(BaseModel):
    period: str | None = Field(default=None, max_length=255)


class PeriodResponse(PeriodCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AcademicPeriodCreate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    code: str | None = Field(default=None, max_length=25)
    period_id: int = Field(..., gt=0)
    year_id: int = Field(..., gt=0)


class AcademicPeriodUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    code: str | None = Field(default=None, max_length=25)
    period_id: int | None = Field(default=None, gt=0)
    year_id: int | None = Field(default=None, gt=0)


class AcademicPeriodResponse(BaseModel):
    id: int
    name: str
    code: str
    period_id: int
    year_id: int
    model_config = ConfigDict(from_attributes=True)


class FacultyCreate(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=25)
    description: str | None = None


class FacultyUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    code: str | None = Field(default=None, max_length=25)
    description: str | None = None


class FacultyResponse(FacultyCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CareerCreate(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=25)
    faculty_id: int = Field(..., gt=0)
    description: str | None = None
    accreditation: str | None = Field(default=None, max_length=255)
    progress: int = Field(default=0, ge=0, le=100)
    status: str = Field(default="en-proceso", max_length=25)


class CareerUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    code: str | None = Field(default=None, max_length=25)
    faculty_id: int | None = Field(default=None, gt=0)
    description: str | None = None
    accreditation: str | None = Field(default=None, max_length=255)
    progress: int | None = Field(default=None, ge=0, le=100)
    status: str | None = Field(default=None, max_length=25)


class CareerResponse(CareerCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SubjectCreate(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=25)
    career_id: int = Field(..., gt=0)
    description: str | None = None


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    code: str | None = Field(default=None, max_length=25)
    career_id: int | None = Field(default=None, gt=0)
    description: str | None = None


class SubjectResponse(SubjectCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str = Field(..., max_length=255)
    surname: str = Field(..., max_length=255)
    code: str = Field(..., max_length=25)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role_id: int = Field(..., gt=0)
    career_id: int = Field(..., gt=0)
    subject_ids: list[int] = Field(default_factory=list)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    surname: str | None = Field(default=None, max_length=255)
    code: str | None = Field(default=None, max_length=25)
    email: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role_id: int | None = Field(default=None, gt=0)
    career_id: int | None = Field(default=None, gt=0)
    subject_ids: list[int] | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value else value


class UserResponse(BaseModel):
    id: int
    name: str
    surname: str
    code: str
    email: str
    active: bool
    role_id: int
    career_id: int
    subject_ids: list[int]
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, user: Any) -> "UserResponse":
        return cls(
            id=user.id,
            name=user.name,
            surname=user.surname,
            code=user.code,
            email=user.email,
            active=user.active,
            role_id=user.role_id,
            career_id=user.career_id,
            subject_ids=[item.subject_id for item in user.user_subjects],
            created_at=user.created_at,
        )
