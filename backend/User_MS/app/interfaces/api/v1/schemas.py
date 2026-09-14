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
