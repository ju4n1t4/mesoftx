"""Composition root: concrete adapters are assembled here, outside application."""
from types import SimpleNamespace
from app.infrastructure.repositories import sqlalchemy_repositories as repositories
from app.infrastructure.clients.user_ms_client import UserMsClient

def build_context(db):
    return SimpleNamespace(
        repositories=SimpleNamespace(
            student_outcome=repositories.StudentOutcomeRepository(db),
            performance=repositories.PerformanceRepository(db),
            level=repositories.LevelRepository(db),
            so_schedule=repositories.SoScheduleRepository(db),
            period_target=repositories.PeriodTargetRepository(db),
            rubric=repositories.RubricRepository(db),
            evidence=repositories.EvidenceRepository(db),
            schedule_subject=repositories.ScheduleSubjectRepository(db),
            dashboard=repositories.DashboardRepository(db),
        ),
        directory=UserMsClient(),
    )
