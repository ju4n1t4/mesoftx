from datetime import datetime

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Integer,
    SmallInteger, String, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.session import Base


class StudentOutcomeModel(Base):
    __tablename__ = "so"

    id: Mapped[str] = mapped_column(String(5), primary_key=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    college_id: Mapped[str] = mapped_column(String(3), nullable=False)  # cross-service


class PerformanceModel(Base):
    __tablename__ = "performance"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    so_id: Mapped[str] = mapped_column(
        ForeignKey("so.id", ondelete="CASCADE"), nullable=False
    )

    student_outcome: Mapped[StudentOutcomeModel] = relationship(lazy="selectin")


class LevelModel(Base):
    __tablename__ = "level"
    __table_args__ = (
        UniqueConstraint("performance_id", "id", name="uq_level_performance"),
        UniqueConstraint("performance_id", "rank", name="uq_level_rank"),
        CheckConstraint("rank BETWEEN 1 AND 4", name="ck_level_rank"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    rank: Mapped[int] = mapped_column(SmallInteger, nullable=False)   # 1..4
    performance_id: Mapped[str] = mapped_column(
        ForeignKey("performance.id", ondelete="CASCADE"), nullable=False
    )

    performance: Mapped[PerformanceModel] = relationship(lazy="selectin")


class SoScheduleModel(Base):
    __tablename__ = "so_schedule"
    __table_args__ = (
        UniqueConstraint("so_id", "period_id", name="uq_so_schedule"),
        CheckConstraint(
            "status IN ('PLANIFICADO','EN_CURSO','CERRADO')",
            name="ck_schedule_status",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    so_id: Mapped[str] = mapped_column(
        ForeignKey("so.id", ondelete="CASCADE"), nullable=False
    )
    period_id: Mapped[int] = mapped_column(Integer, nullable=False)            # cross-service
    coordinator_user_id: Mapped[int] = mapped_column(Integer, nullable=False)  # cross-service
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_by: Mapped[int | None] = mapped_column(Integer)          # cross-service
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    student_outcome: Mapped[StudentOutcomeModel] = relationship(lazy="selectin")
    subjects: Mapped[list["ScheduleSubjectModel"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )


class ScheduleSubjectModel(Base):
    """Qué NRC valoran cada SO programado."""
    __tablename__ = "schedule_subjects"
    __table_args__ = (
        UniqueConstraint("schedule_id", "subjects_id", name="uq_schedule_subject"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("so_schedule.id", ondelete="CASCADE"), nullable=False
    )
    subjects_id: Mapped[int] = mapped_column(Integer, nullable=False)   # cross-service (NRC)


class EvidenceModel(Base):
    """Funcionalidad futura. Un archivo por estudiante-NRC-programación."""
    __tablename__ = "evidence"
    __table_args__ = (
        UniqueConstraint("schedule_id", "subjects_id", "student_id", "id",
                         name="uq_evidence_ctx"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("so_schedule.id", ondelete="CASCADE"), nullable=False
    )
    subjects_id: Mapped[int] = mapped_column(Integer, nullable=False)   # cross-service
    student_id: Mapped[int] = mapped_column(Integer, nullable=False)    # cross-service
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    uploaded_by: Mapped[int] = mapped_column(Integer, nullable=False)   # cross-service
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )


class RubricModel(Base):
    __tablename__ = "rubric"
    __table_args__ = (
        ForeignKeyConstraint(
            ["performance_id", "level_id"],
            ["level.performance_id", "level.id"],
            name="fk_rubric_level",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["schedule_id", "subjects_id", "student_id", "evidence_id"],
            ["evidence.schedule_id", "evidence.subjects_id",
             "evidence.student_id", "evidence.id"],
            name="fk_rubric_evidence",
            ondelete="SET NULL (evidence_id)",   # SQLAlchemy pasa el texto tal cual al DDL
        ),
        UniqueConstraint(
            "schedule_id", "student_id", "subjects_id", "performance_id",
            name="uq_rubric",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("so_schedule.id", ondelete="CASCADE"), nullable=False
    )
    evaluator_user_id: Mapped[int] = mapped_column(Integer, nullable=False)  # cross-service (profesor)
    student_id: Mapped[int] = mapped_column(Integer, nullable=False)         # cross-service (students.id)
    subjects_id: Mapped[int] = mapped_column(Integer, nullable=False)        # cross-service (NRC)
    performance_id: Mapped[str] = mapped_column(String(20), nullable=False)
    level_id: Mapped[str] = mapped_column(String(100), nullable=False)
    evidence_id: Mapped[int | None] = mapped_column(Integer)   # FK compuesta arriba
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    schedule: Mapped[SoScheduleModel] = relationship(lazy="selectin")
