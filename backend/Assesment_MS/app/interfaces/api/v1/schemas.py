from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    detail: str


class StudentOutcomeCreate(BaseModel):
    id: str = Field(..., max_length=5)
    description: str = Field(..., max_length=255)
    college_id: str = Field(..., max_length=3)


class StudentOutcomeUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=255)
    college_id: str | None = Field(default=None, max_length=3)


class StudentOutcomeResponse(StudentOutcomeCreate):
    model_config = ConfigDict(from_attributes=True)
