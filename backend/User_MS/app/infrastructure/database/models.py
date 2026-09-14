from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.session import Base


class CollegeModel(Base):
    __tablename__ = "college"

    id: Mapped[str] = mapped_column(String(3), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)


class ProgramModel(Base):
    __tablename__ = "program"

    id: Mapped[str] = mapped_column(String(3), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    college_id: Mapped[str] = mapped_column(
        ForeignKey("college.id", ondelete="CASCADE"), nullable=False
    )
    accredited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    accreditation_end_year: Mapped[int | None] = mapped_column(Integer)

    college: Mapped[CollegeModel] = relationship()


class PeriodModel(Base):
    __tablename__ = "periods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False)


class RoleModel(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))


class PermissionModel(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))


class RolePermissionModel(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False
    )

    permission: Mapped[PermissionModel] = relationship(lazy="selectin")


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_number: Mapped[str] = mapped_column(String(25), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    password: Mapped[str | None] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False
    )
    program_id: Mapped[str | None] = mapped_column(   # SOLO Profesor. NULL para los demás
        ForeignKey("program.id", ondelete="CASCADE")
    )
    accredited: Mapped[bool | None] = mapped_column(Boolean)          # solo Profesor
    created_by: Mapped[int | None] = mapped_column(                    # NULL solo para el admin inicial
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    role: Mapped[RoleModel] = relationship(lazy="selectin")
    program: Mapped[ProgramModel] = relationship()


class SubjectModel(Base):
    __tablename__ = "subjects"

    nrc: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materia_curso: Mapped[str] = mapped_column(String(25), nullable=False, index=True)  # código institucional
    name: Mapped[str] = mapped_column(String(255), nullable=False)                     # nombre de la materia
    periods_id: Mapped[int] = mapped_column(
        ForeignKey("periods.id", ondelete="CASCADE"), nullable=False
    )
    program_id: Mapped[str] = mapped_column(
        ForeignKey("program.id", ondelete="CASCADE"), nullable=False
    )

    period: Mapped[PeriodModel] = relationship()
    program: Mapped[ProgramModel] = relationship()


class StudentModel(Base):
    """Estudiantes. NO son usuarios: no tienen login."""
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_number: Mapped[str] = mapped_column(String(25), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    program_id: Mapped[str] = mapped_column(
        ForeignKey("program.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    program: Mapped[ProgramModel] = relationship()


class StudentSubjectModel(Base):
    __tablename__ = "students_subjects"
    __table_args__ = (
        UniqueConstraint("student_id", "subjects_id", name="uq_student_subject"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    subjects_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.nrc", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )


class TeacherSubjectModel(Base):
    __tablename__ = "teacher_subjects"
    __table_args__ = (
        UniqueConstraint("user_id", "subjects_id", name="uq_teacher_subject"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subjects_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.nrc", ondelete="CASCADE"), nullable=False
    )
    assigned_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    subject: Mapped[SubjectModel] = relationship(lazy="selectin")
