from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.application.ports.errors import ApplicationError, EntityAlreadyExistsError
from app.infrastructure.database.integration_models import IntegrationConnectionModel, IntegrationRecordModel, IntegrationRunModel

class SqlIntegrationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_connections(self):
        return list(self.db.scalars(select(IntegrationConnectionModel).order_by(IntegrationConnectionModel.id)))

    def get_connection(self, connection_id: int):
        return self.db.get(IntegrationConnectionModel, connection_id)

    def save_connection(self, data: dict[str, Any], connection_id: int | None = None):
        connection = self.get_connection(connection_id) if connection_id is not None else IntegrationConnectionModel()
        for key, value in data.items():
            setattr(connection, key, value)
        connection.updated_at = datetime.now(timezone.utc)
        self.db.add(connection)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise EntityAlreadyExistsError('A connection with this name already exists.') from exc
        self.db.refresh(connection)
        return connection

    def start_run(self, connection_id: int, key: str, actor_id: int):
        # Serialize starts per connection and commit run before accessing the provider.
        self.db.scalar(select(IntegrationConnectionModel).where(IntegrationConnectionModel.id == connection_id).with_for_update())
        pending = self.db.scalar(select(IntegrationRunModel).where(
            IntegrationRunModel.connection_id == connection_id, IntegrationRunModel.status == 'running').with_for_update())
        if pending and pending.started_at < datetime.now(timezone.utc) - timedelta(minutes=10):
            pending.status, pending.error_code, pending.finished_at = 'failed', 'interrupted', datetime.now(timezone.utc)
            self.db.flush()
        run = self.db.scalar(select(IntegrationRunModel).where(
            IntegrationRunModel.connection_id == connection_id, IntegrationRunModel.idempotency_key == key))
        if run:
            self.db.commit()
            return run, True
        if pending and pending.status == 'running':
            self.db.rollback()
            raise ApplicationError('conflict', 'Another synchronization is running.')
        run = IntegrationRunModel(connection_id=connection_id, idempotency_key=key, started_by=actor_id)
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run, False

    def finish_run(self, run_id: int, records: list[tuple[str, dict[str, Any]]]):
        run = self.db.get(IntegrationRunModel, run_id)
        try:
            for external_id, payload in records:
                stmt = insert(IntegrationRecordModel).values(connection_id=run.connection_id, external_id=external_id,
                    payload=payload, last_run_id=run_id, updated_at=datetime.now(timezone.utc))
                self.db.execute(stmt.on_conflict_do_update(index_elements=['connection_id', 'external_id'],
                    set_={'payload': stmt.excluded.payload, 'last_run_id': run_id, 'updated_at': stmt.excluded.updated_at}))
            run.status, run.records_count, run.finished_at = 'succeeded', len(records), datetime.now(timezone.utc)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return run

    def fail_run(self, run_id: int, code: str):
        self.db.rollback()
        run = self.db.get(IntegrationRunModel, run_id)
        run.status, run.error_code, run.finished_at = 'failed', code, datetime.now(timezone.utc)
        self.db.commit()
        return run

    def list_runs(self, connection_id: int):
        return list(self.db.scalars(select(IntegrationRunModel).where(
            IntegrationRunModel.connection_id == connection_id).order_by(IntegrationRunModel.id.desc()).limit(100)))

    def list_records(self, connection_id: int, offset: int, limit: int):
        return list(self.db.scalars(select(IntegrationRecordModel).where(
            IntegrationRecordModel.connection_id == connection_id).order_by(IntegrationRecordModel.id).offset(offset).limit(limit)))
