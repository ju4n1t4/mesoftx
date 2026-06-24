from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.session import Base


class StudentOutcomeModel(Base):
    __tablename__ = "student_outcomes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class PerformanceIndicatorModel(Base):
    __tablename__ = "performance_indicators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(Text)


class PerformanceIndicatorDetailModel(Base):
    __tablename__ = "performance_indicator_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    performance_indicator_id: Mapped[int] = mapped_column(ForeignKey("performance_indicators.id"), nullable=False)
    student_outcome_id: Mapped[int] = mapped_column(ForeignKey("student_outcomes.id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    performance_indicator: Mapped[PerformanceIndicatorModel] = relationship()
    student_outcome: Mapped[StudentOutcomeModel] = relationship()


class PerformanceEvaluationModel(Base):
    __tablename__ = "performance_evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    evaluation_value: Mapped[str] = mapped_column(String(255), nullable=False)


class PerformanceEvaluationDetailModel(Base):
    __tablename__ = "performance_evaluation_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    performance_evaluation_id: Mapped[int] = mapped_column(ForeignKey("performance_evaluations.id"), nullable=False)
    performance_indicator_id: Mapped[int] = mapped_column(ForeignKey("performance_indicators.id"), nullable=False)
    student_outcome_id: Mapped[int] = mapped_column(ForeignKey("student_outcomes.id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    performance_evaluation: Mapped[PerformanceEvaluationModel] = relationship()
    performance_indicator: Mapped[PerformanceIndicatorModel] = relationship()
    student_outcome: Mapped[StudentOutcomeModel] = relationship()


class AssesmentEvidenceModel(Base):
    __tablename__ = "assesment_evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    evidence_name_doc: Mapped[str] = mapped_column(Text, nullable=False)
    student_code: Mapped[str] = mapped_column(String(25), nullable=False)
    student_outcome_id: Mapped[int] = mapped_column(ForeignKey("student_outcomes.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    student_outcome: Mapped[StudentOutcomeModel] = relationship()


class AssesmentResultModel(Base):
    __tablename__ = "assesment_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    subject_code: Mapped[str] = mapped_column(String(25), nullable=False)
    assesment_evidence_id: Mapped[int] = mapped_column(ForeignKey("assesment_evidence.id"), nullable=False)
    student_outcome_id: Mapped[int] = mapped_column(ForeignKey("student_outcomes.id"), nullable=False)
    performance_evaluation_detail_id: Mapped[int] = mapped_column(
        ForeignKey("performance_evaluation_details.id"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    assesment_evidence: Mapped[AssesmentEvidenceModel] = relationship()
    student_outcome: Mapped[StudentOutcomeModel] = relationship()
    performance_evaluation_detail: Mapped[PerformanceEvaluationDetailModel] = relationship()
