from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.session import Base
# Register the users table before SQLAlchemy resolves cross-model foreign keys.
from app.infrastructure.database.models import UserModel  # noqa: F401

class IntegrationConnectionModel(Base):
    __tablename__ = 'integration_connections'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    base_url: Mapped[str] = mapped_column(String(500))
    resource_path: Mapped[str] = mapped_column(String(500), default='/')
    records_path: Mapped[str] = mapped_column(String(200), default='')
    external_id_field: Mapped[str] = mapped_column(String(100), default='id')
    auth_type: Mapped[str] = mapped_column(String(20), default='none')
    encrypted_secret: Mapped[str | None] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class IntegrationRunModel(Base):
    __tablename__ = 'integration_sync_runs'
    __table_args__ = (UniqueConstraint('connection_id', 'idempotency_key'),
        Index('uq_integration_running', 'connection_id', unique=True, postgresql_where=text("status = 'running'")))
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    connection_id: Mapped[int] = mapped_column(ForeignKey('integration_connections.id', ondelete='RESTRICT'))
    idempotency_key: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default='running')
    records_count: Mapped[int] = mapped_column(Integer, default=0)
    error_code: Mapped[str | None] = mapped_column(String(100))
    started_by: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class IntegrationRecordModel(Base):
    __tablename__ = 'integration_records'
    __table_args__ = (UniqueConstraint('connection_id', 'external_id'),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    connection_id: Mapped[int] = mapped_column(ForeignKey('integration_connections.id', ondelete='RESTRICT'))
    external_id: Mapped[str] = mapped_column(String(255))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    last_run_id: Mapped[int] = mapped_column(ForeignKey('integration_sync_runs.id', ondelete='RESTRICT'))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
