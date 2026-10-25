from typing import Any, Protocol

class StudentOutcomeRepositoryPort(Protocol):

    def list_by_college(self, college_id: Any) -> Any:
        ...

    def delete_many(self, entities: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class PerformanceRepositoryPort(Protocol):

    def create(self, data: Any) -> Any:
        ...

    def list_by_so(self, so_id: Any) -> Any:
        ...

    def count_by_so(self, so_id: Any) -> Any:
        ...

    def _next_internal_id(self) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class LevelRepositoryPort(Protocol):

    def list_by_performance(self, performance_id: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class SoScheduleRepositoryPort(Protocol):

    def list_by_period(self, period_id: Any) -> Any:
        ...

    def list_current(self) -> Any:
        ...

    def _scope_by_nrcs(self, stmt: Any, nrcs: Any) -> Any:
        ...

    def list_all_scoped(self, nrcs: Any=None) -> Any:
        ...

    def list_by_period_scoped(self, period_id: Any, nrcs: Any=None) -> Any:
        ...

    def list_current_scoped(self, nrcs: Any=None) -> Any:
        ...

    def has_rubrics(self, schedule_id: Any) -> Any:
        ...

    def has_closed_in_period(self, period_id: Any) -> Any:
        ...

    def replace_subjects(self, schedule_id: Any, nrcs: Any) -> Any:
        ...

    def nrcs_for_schedule(self, schedule_id: Any) -> Any:
        ...

    def closed_periods_for_so(self, so_id: Any) -> Any:
        ...

    def closed_periods_for_period(self, period_id: Any) -> Any:
        ...

    def closed_periods_for_college(self, college_id: Any) -> Any:
        ...

    def assessments_for_nrcs(self, nrcs: Any) -> Any:
        ...

    def delete_many(self, entities: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class PeriodTargetRepositoryPort(Protocol):

    def get(self, period_id: Any) -> Any:
        ...

    def upsert(self, period_id: Any, target_pct: Any, user_id: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class RubricRepositoryPort(Protocol):

    def list_by_period(self, period_id: Any, nrcs: Any=None) -> Any:
        ...

    def list_scoped(self, nrcs: Any=None) -> Any:
        ...

    def list_filtered(self, *, period_id: Any=None, schedule_id: Any=None, subjects_id: Any=None, student_id: Any=None, nrcs: Any=None) -> Any:
        ...

    def _closed_periods_for(self, whereclause: Any) -> Any:
        ...

    def closed_periods_by_filter(self, **filters: int) -> Any:
        ...

    def closed_periods_for_performance(self, performance_id: Any) -> Any:
        ...

    def closed_periods_for_level(self, performance_id: Any, level_id: Any) -> Any:
        ...

    def _filter_column(self, **filters: int) -> Any:
        ...

    def delete_by_filter(self, **filters: int) -> Any:
        ...

    def delete_evidence_by_filter(self, **filters: int) -> Any:
        ...

    def commit(self) -> Any:
        ...

    def rollback(self) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class EvidenceRepositoryPort(Protocol):

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class ScheduleSubjectRepositoryPort(Protocol):

    def delete_by_subject(self, subjects_id: Any) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class DashboardRepositoryPort(Protocol):

    def expected_rows(self, period_id: Any) -> Any:
        ...

    def expected_rows_by_so(self, period_id: Any) -> Any:
        ...

    def scheduled_so_ids(self, period_id: Any) -> Any:
        ...

    def progress_by_so(self, period_id: Any) -> Any:
        ...

    def progress_by_subject(self, period_id: Any) -> Any:
        ...

    def progress_by_teacher(self, period_id: Any) -> Any:
        ...

    def indicators_chart(self, period_id: Any) -> Any:
        ...

    def public_level_counts(self) -> Any:
        ...

    def public_students_by_so(self) -> Any:
        ...

    def all_outcomes(self) -> Any:
        ...

    def get_by_id(self, entity_id: Any) -> Any:
        ...

    def list_all(self) -> Any:
        ...

    def create(self, data: Any) -> Any:
        ...

    def update(self, entity_id: Any, data: Any) -> Any:
        ...

    def delete(self, entity_id: Any) -> Any:
        ...

class RepositoryPorts(Protocol):
    student_outcome: StudentOutcomeRepositoryPort
    performance: PerformanceRepositoryPort
    level: LevelRepositoryPort
    so_schedule: SoScheduleRepositoryPort
    period_target: PeriodTargetRepositoryPort
    rubric: RubricRepositoryPort
    evidence: EvidenceRepositoryPort
    schedule_subject: ScheduleSubjectRepositoryPort
    dashboard: DashboardRepositoryPort

class DirectoryPort(Protocol):

    async def user_exists(self, user_id: Any) -> Any:
        ...

    async def subject_exists(self, nrc: Any) -> Any:
        ...

    async def subject_period(self, nrc: Any) -> Any:
        ...

    async def period_exists(self, period_id: Any) -> Any:
        ...

    async def student_exists(self, student_id: Any) -> Any:
        ...

    async def student_enrolled(self, student_id: Any, nrc: Any) -> Any:
        ...

    async def teacher_has_subject(self, user_id: Any, nrc: Any) -> Any:
        ...

    async def teacher_subjects(self, user_id: Any) -> Any:
        ...

    async def enrolled_counts(self, nrcs: Any) -> Any:
        ...

    async def subjects_teachers(self, nrcs: Any) -> Any:
        ...

    async def subjects_programs(self, nrcs: Any) -> Any:
        ...

class ApplicationContext(Protocol):
    repositories: RepositoryPorts
    directory: DirectoryPort
