from typing import Any

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.database.models import (
    EvidenceModel,
    LevelModel,
    PerformanceModel,
    RubricModel,
    ScheduleSubjectModel,
    SoScheduleModel,
    StudentOutcomeModel,
)


class RepositoryError(Exception):
    pass


class EntityAlreadyExistsError(RepositoryError):
    pass


class EntityNotFoundError(RepositoryError):
    pass


class InvalidReferenceError(RepositoryError):
    pass


class SqlAlchemyRepository:
    model: type[Any]
    order_by_column: str = "id"

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, entity_id: Any) -> Any | None:
        return self.db.get(self.model, entity_id)

    def list_all(self) -> list[Any]:
        order_column = getattr(self.model, self.order_by_column)
        return list(self.db.scalars(select(self.model).order_by(order_column)).all())

    def create(self, data: dict[str, Any]) -> Any:
        entity = self.model(**data)
        self.db.add(entity)
        return self._commit(entity)

    def update(self, entity_id: Any, data: dict[str, Any]) -> Any | None:
        entity = self.get_by_id(entity_id)
        if not entity:
            return None
        for key, value in data.items():
            setattr(entity, key, value)
        return self._commit(entity)

    def delete(self, entity_id: Any) -> bool:
        entity = self.get_by_id(entity_id)
        if not entity:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    def _commit(self, entity: Any) -> Any:
        try:
            self.db.commit()
            self.db.refresh(entity)
            return entity
        except IntegrityError as exc:
            self.db.rollback()
            raise InvalidReferenceError("Invalid referenced data or duplicated unique value.") from exc


class StudentOutcomeRepository(SqlAlchemyRepository):
    model = StudentOutcomeModel

    def list_by_college(self, college_id: str) -> list[StudentOutcomeModel]:
        return list(
            self.db.scalars(select(StudentOutcomeModel).where(StudentOutcomeModel.college_id == college_id)).all()
        )


class PerformanceRepository(SqlAlchemyRepository):
    model = PerformanceModel

    def create(self, data: dict[str, Any]) -> PerformanceModel:
        visible_code = str(data.pop("id")).strip()
        data["id"] = self._next_internal_id()
        data["code"] = visible_code
        return super().create(data)

    def list_by_so(self, so_id: str) -> list[PerformanceModel]:
        return list(
            self.db.scalars(
                select(PerformanceModel)
                .where(PerformanceModel.so_id == so_id)
                .order_by(PerformanceModel.code, PerformanceModel.id)
            ).all()
        )

    def count_by_so(self, so_id: str) -> int:
        return int(self.db.scalar(select(func.count()).select_from(PerformanceModel).where(PerformanceModel.so_id == so_id)) or 0)

    def _next_internal_id(self) -> str:
        try:
            candidate = int(self.db.scalar(text("SELECT nextval('performance_internal_id_seq')")) or 1)
        except Exception:
            candidate = int(self.db.scalar(select(func.count()).select_from(PerformanceModel)) or 0) + 1
        while self.get_by_id(str(candidate)) is not None:
            candidate += 1
        return str(candidate)


class LevelRepository(SqlAlchemyRepository):
    model = LevelModel
    order_by_column = "rank"

    def list_by_performance(self, performance_id: str) -> list[LevelModel]:
        return list(
            self.db.scalars(
                select(LevelModel).where(LevelModel.performance_id == performance_id).order_by(LevelModel.rank)
            ).all()
        )


class SoScheduleRepository(SqlAlchemyRepository):
    model = SoScheduleModel

    def list_by_period(self, period_id: int) -> list[SoScheduleModel]:
        return list(self.db.scalars(select(SoScheduleModel).where(SoScheduleModel.period_id == period_id)).all())

    def list_current(self) -> list[SoScheduleModel]:
        return list(self.db.scalars(select(SoScheduleModel).where(SoScheduleModel.status == "EN_CURSO")).all())

    def _scope_by_nrcs(self, stmt, nrcs: list[int] | None):
        if nrcs is None:
            return stmt
        sub = select(ScheduleSubjectModel.schedule_id).where(ScheduleSubjectModel.subjects_id.in_(nrcs))
        return stmt.where(SoScheduleModel.id.in_(sub))

    def list_all_scoped(self, nrcs: list[int] | None = None) -> list[SoScheduleModel]:
        stmt = self._scope_by_nrcs(select(SoScheduleModel), nrcs)
        return list(self.db.scalars(stmt).all())

    def list_by_period_scoped(self, period_id: int, nrcs: list[int] | None = None) -> list[SoScheduleModel]:
        stmt = self._scope_by_nrcs(select(SoScheduleModel).where(SoScheduleModel.period_id == period_id), nrcs)
        return list(self.db.scalars(stmt).all())

    def list_current_scoped(self, nrcs: list[int] | None = None) -> list[SoScheduleModel]:
        stmt = self._scope_by_nrcs(select(SoScheduleModel).where(SoScheduleModel.status == "EN_CURSO"), nrcs)
        return list(self.db.scalars(stmt).all())

    def has_rubrics(self, schedule_id: int) -> bool:
        row = self.db.scalar(select(RubricModel.id).where(RubricModel.schedule_id == schedule_id))
        return row is not None

    def replace_subjects(self, schedule_id: int, nrcs: list[int]) -> None:
        self.db.execute(sa_delete(ScheduleSubjectModel).where(ScheduleSubjectModel.schedule_id == schedule_id))
        for nrc in nrcs:
            self.db.add(ScheduleSubjectModel(schedule_id=schedule_id, subjects_id=nrc))
        self.db.commit()

    def nrcs_for_schedule(self, schedule_id: int) -> list[int]:
        rows = self.db.scalars(
            select(ScheduleSubjectModel.subjects_id).where(ScheduleSubjectModel.schedule_id == schedule_id)
        ).all()
        return list(rows)


class RubricRepository(SqlAlchemyRepository):
    model = RubricModel

    def list_by_period(self, period_id: int, nrcs: list[int] | None = None) -> list[RubricModel]:
        stmt = (
            select(RubricModel)
            .join(SoScheduleModel, SoScheduleModel.id == RubricModel.schedule_id)
            .where(SoScheduleModel.period_id == period_id)
        )
        if nrcs is not None:
            stmt = stmt.where(RubricModel.subjects_id.in_(nrcs))
        return list(self.db.scalars(stmt).all())

    def list_scoped(self, nrcs: list[int] | None = None) -> list[RubricModel]:
        stmt = select(RubricModel)
        if nrcs is not None:
            stmt = stmt.where(RubricModel.subjects_id.in_(nrcs))
        return list(self.db.scalars(stmt).all())

    def list_filtered(
        self,
        *,
        period_id: int | None = None,
        schedule_id: int | None = None,
        subjects_id: int | None = None,
        student_id: int | None = None,
        nrcs: list[int] | None = None,
    ) -> list[RubricModel]:
        stmt = select(RubricModel)
        if period_id is not None:
            stmt = stmt.join(SoScheduleModel, SoScheduleModel.id == RubricModel.schedule_id)
            stmt = stmt.where(SoScheduleModel.period_id == period_id)
        if schedule_id is not None:
            stmt = stmt.where(RubricModel.schedule_id == schedule_id)
        if subjects_id is not None:
            stmt = stmt.where(RubricModel.subjects_id == subjects_id)
        if student_id is not None:
            stmt = stmt.where(RubricModel.student_id == student_id)
        if nrcs is not None:
            stmt = stmt.where(RubricModel.subjects_id.in_(nrcs))
        return list(self.db.scalars(stmt).all())

    # ── Borrado interno cruzado (idempotente) ───────────────
    def _closed_periods_for(self, whereclause) -> list[str]:
        stmt = (
            select(SoScheduleModel.period_id)
            .join(RubricModel, RubricModel.schedule_id == SoScheduleModel.id)
            .where(SoScheduleModel.status == "CERRADO")
            .where(whereclause)
            .distinct()
        )
        return [str(p) for p in self.db.scalars(stmt).all()]

    def closed_periods_by_filter(self, **filters: int) -> list[str]:
        col = self._filter_column(**filters)
        return self._closed_periods_for(col)

    def closed_periods_for_performance(self, performance_id: str) -> list[str]:
        return self._closed_periods_for(RubricModel.performance_id == performance_id)

    def closed_periods_for_level(self, performance_id: str, level_id: str) -> list[str]:
        return self._closed_periods_for(
            (RubricModel.performance_id == performance_id) & (RubricModel.level_id == level_id)
        )

    def _filter_column(self, **filters: int):
        if "evaluator_user_id" in filters:
            return RubricModel.evaluator_user_id == filters["evaluator_user_id"]
        if "subjects_id" in filters:
            return RubricModel.subjects_id == filters["subjects_id"]
        if "student_id" in filters:
            return RubricModel.student_id == filters["student_id"]
        raise InvalidReferenceError("Filtro de borrado no soportado")

    def delete_by_filter(self, **filters: int) -> int:
        """Borra rúbricas por filtro. Las evidencias enlazadas se conservan pero
        quedan con evidence_id = NULL vía la FK; el borrado de evidencias del
        mismo contexto lo hace delete_evidence_by_filter. Devuelve cuántas borró."""
        col = self._filter_column(**filters)
        result = self.db.execute(sa_delete(RubricModel).where(col))
        return int(result.rowcount or 0)

    def delete_evidence_by_filter(self, **filters: int) -> int:
        if "subjects_id" in filters:
            col = EvidenceModel.subjects_id == filters["subjects_id"]
        elif "student_id" in filters:
            col = EvidenceModel.student_id == filters["student_id"]
        elif "evaluator_user_id" in filters:
            col = EvidenceModel.uploaded_by == filters["evaluator_user_id"]
        else:
            return 0
        result = self.db.execute(sa_delete(EvidenceModel).where(col))
        return int(result.rowcount or 0)

    def commit(self) -> None:
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()


class EvidenceRepository(SqlAlchemyRepository):
    model = EvidenceModel


class ScheduleSubjectRepository(SqlAlchemyRepository):
    model = ScheduleSubjectModel

    def delete_by_subject(self, subjects_id: int) -> int:
        result = self.db.execute(sa_delete(ScheduleSubjectModel).where(ScheduleSubjectModel.subjects_id == subjects_id))
        self.db.commit()
        return int(result.rowcount or 0)


class DashboardRepository:
    """Consultas agregadas del paso 14."""

    def __init__(self, db: Session):
        self.db = db

    def expected_rows(self, period_id: int) -> list[tuple[int, int, int]]:
        """(schedule_id, subjects_id, indicadores_del_so) por schedule_subject del periodo."""
        indic = (
            select(func.count())
            .select_from(PerformanceModel)
            .where(PerformanceModel.so_id == SoScheduleModel.so_id)
            .scalar_subquery()
        )
        stmt = (
            select(ScheduleSubjectModel.schedule_id, ScheduleSubjectModel.subjects_id, indic)
            .join(SoScheduleModel, SoScheduleModel.id == ScheduleSubjectModel.schedule_id)
            .where(SoScheduleModel.period_id == period_id)
        )
        return [(int(a), int(b), int(c)) for a, b, c in self.db.execute(stmt).all()]

    def expected_rows_by_so(self, period_id: int) -> list[tuple[str, int, int]]:
        """(so_id, subjects_id, indicadores_del_so) por schedule_subject del periodo.
        Igual que expected_rows pero devolviendo el so_id de la programación."""
        indic = (
            select(func.count())
            .select_from(PerformanceModel)
            .where(PerformanceModel.so_id == SoScheduleModel.so_id)
            .scalar_subquery()
        )
        stmt = (
            select(SoScheduleModel.so_id, ScheduleSubjectModel.subjects_id, indic)
            .join(SoScheduleModel, SoScheduleModel.id == ScheduleSubjectModel.schedule_id)
            .where(SoScheduleModel.period_id == period_id)
        )
        return [(str(a), int(b), int(c)) for a, b, c in self.db.execute(stmt).all()]

    def scheduled_so_ids(self, period_id: int) -> list[str]:
        stmt = (
            select(SoScheduleModel.so_id)
            .where(SoScheduleModel.period_id == period_id)
            .order_by(SoScheduleModel.so_id)
        )
        return [str(so_id) for so_id in self.db.scalars(stmt).all()]

    def progress_by_so(self, period_id: int) -> list[tuple[str, int]]:
        stmt = (
            select(SoScheduleModel.so_id, func.count(RubricModel.id))
            .select_from(SoScheduleModel)
            .outerjoin(RubricModel, RubricModel.schedule_id == SoScheduleModel.id)
            .where(SoScheduleModel.period_id == period_id)
            .group_by(SoScheduleModel.so_id)
        )
        return [(str(a), int(b)) for a, b in self.db.execute(stmt).all()]

    def progress_by_subject(self, period_id: int) -> list[tuple[int, int]]:
        """(subjects_id, rúbricas registradas) del periodo. La capa de endpoint
        agrupa por el program_id de cada NRC (que resuelve User_MS)."""
        stmt = (
            select(RubricModel.subjects_id, func.count(RubricModel.id))
            .join(SoScheduleModel, SoScheduleModel.id == RubricModel.schedule_id)
            .where(SoScheduleModel.period_id == period_id)
            .group_by(RubricModel.subjects_id)
        )
        return [(int(a), int(b)) for a, b in self.db.execute(stmt).all()]

    def progress_by_teacher(self, period_id: int) -> list[tuple[int, int]]:
        stmt = (
            select(RubricModel.evaluator_user_id, func.count())
            .join(SoScheduleModel, SoScheduleModel.id == RubricModel.schedule_id)
            .where(SoScheduleModel.period_id == period_id)
            .group_by(RubricModel.evaluator_user_id)
        )
        return [(int(a), int(b)) for a, b in self.db.execute(stmt).all()]

    def indicators_chart(self, period_id: int) -> list[tuple[str, int, str, int]]:
        stmt = (
            select(RubricModel.performance_id, LevelModel.rank, LevelModel.id, func.count())
            .join(
                LevelModel,
                (LevelModel.performance_id == RubricModel.performance_id) & (LevelModel.id == RubricModel.level_id),
            )
            .join(SoScheduleModel, SoScheduleModel.id == RubricModel.schedule_id)
            .where(SoScheduleModel.period_id == period_id)
            .group_by(RubricModel.performance_id, LevelModel.rank, LevelModel.id)
            .order_by(RubricModel.performance_id, LevelModel.rank)
        )
        return [(str(a), int(b), str(c), int(d)) for a, b, c, d in self.db.execute(stmt).all()]
