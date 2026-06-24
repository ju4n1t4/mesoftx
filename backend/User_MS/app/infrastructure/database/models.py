from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.session import Base


class RoleModel(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class YearModel(Base):
    __tablename__ = "years"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    year: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)


class PeriodModel(Base):
    __tablename__ = "periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    period: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)


class AcademicPeriodModel(Base):
    __tablename__ = "academic_periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(25), unique=True, nullable=False)
    period_id: Mapped[int] = mapped_column(ForeignKey("periods.id"), nullable=False)
    year_id: Mapped[int] = mapped_column(ForeignKey("years.id"), nullable=False)

    period: Mapped[PeriodModel] = relationship()
    year: Mapped[YearModel] = relationship()


class FacultyModel(Base):
    __tablename__ = "faculty"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(25), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class CareerModel(Base):
    __tablename__ = "career"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(25), unique=True, nullable=False)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.id"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    faculty: Mapped[FacultyModel] = relationship()


class SubjectModel(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(25), unique=True, nullable=False)
    career_id: Mapped[int] = mapped_column(ForeignKey("career.id"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    career: Mapped[CareerModel] = relationship()


class UserSubjectModel(Base):
    __tablename__ = "users_subjects"
    __table_args__ = (UniqueConstraint("user_id", "subject_id", name="uq_user_subject"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    subject: Mapped[SubjectModel] = relationship()


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    surname: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(25), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password: Mapped[str | None] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    career_id: Mapped[int] = mapped_column(ForeignKey("career.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    role: Mapped[RoleModel] = relationship()
    career: Mapped[CareerModel] = relationship()
    user_subjects: Mapped[list[UserSubjectModel]] = relationship(
        cascade="all, delete-orphan",
        lazy="selectin",
    )
