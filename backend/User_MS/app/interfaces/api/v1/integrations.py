from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.application.services.integration_service import IntegrationService
from app.core.config import get_settings
from app.infrastructure.clients.external_json_client import HttpExternalJsonClient
from app.infrastructure.repositories.integration_repository import SqlIntegrationRepository
from app.infrastructure.security.integration_vault import FernetSecretVault
from app.interfaces.api.v1.dependencies import db_session, require_permission

router = APIRouter(prefix='/integrations', tags=['External integrations'],
    dependencies=[Depends(require_permission('INTEGRATION_MANAGE'))])

class ConnectionCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=120, pattern=r'^\S(?:.*\S)?$')
    base_url: str = Field(max_length=500)
    resource_path: str = Field(default='/', max_length=500)
    records_path: str = Field(default='', max_length=200, pattern=r'^[\w.]*$')
    external_id_field: str = Field(default='id', min_length=1, max_length=100)
    auth_type: Literal['none', 'bearer', 'api_key'] = 'none'
    secret: str | None = Field(default=None, max_length=10000, repr=False)
    enabled: bool = False

class ConnectionUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str | None = Field(default=None, min_length=1, max_length=120)
    base_url: str | None = Field(default=None, max_length=500)
    resource_path: str | None = Field(default=None, max_length=500)
    records_path: str | None = Field(default=None, max_length=200, pattern=r'^[\w.]*$')
    external_id_field: str | None = Field(default=None, min_length=1, max_length=100)
    auth_type: Literal['none', 'bearer', 'api_key'] | None = None
    secret: str | None = Field(default=None, max_length=10000, repr=False)
    enabled: bool | None = None

class ConnectionResponse(BaseModel):
    id: int
    name: str
    base_url: str
    resource_path: str
    records_path: str
    external_id_field: str
    auth_type: str
    enabled: bool
    credential_configured: bool
    created_at: datetime
    updated_at: datetime

class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    connection_id: int
    status: str
    records_count: int
    error_code: str | None
    started_at: datetime
    finished_at: datetime | None

class RecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    external_id: str
    payload: dict[str, Any]
    updated_at: datetime


def integration_service(db: Session = Depends(db_session)) -> IntegrationService:
    settings = get_settings()
    return IntegrationService(SqlIntegrationRepository(db), FernetSecretVault(settings.integrations_encryption_key, [key.strip() for key in settings.integrations_previous_keys.split(',') if key.strip()]),
        HttpExternalJsonClient([host.strip() for host in settings.external_api_allowed_hosts.split(',') if host.strip()]))


def public_connection(connection) -> ConnectionResponse:
    fields = {name: getattr(connection, name) for name in ConnectionResponse.model_fields if name != 'credential_configured'}
    return ConnectionResponse(**fields, credential_configured=bool(connection.encrypted_secret))


@router.get('', response_model=list[ConnectionResponse])
def list_connections(service: IntegrationService = Depends(integration_service)):
    return [public_connection(row) for row in service.repository.list_connections()]


@router.post('', response_model=ConnectionResponse, status_code=201)
def create_connection(payload: ConnectionCreate, service: IntegrationService = Depends(integration_service),
    actor=Depends(require_permission('INTEGRATION_MANAGE'))):
    return public_connection(service.save({**payload.model_dump(), 'created_by': actor.id}))


@router.patch('/{connection_id}', response_model=ConnectionResponse)
def update_connection(connection_id: int, payload: ConnectionUpdate, service: IntegrationService = Depends(integration_service)):
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    return public_connection(service.save(data, connection_id))


@router.post('/{connection_id}/sync', response_model=RunResponse)
async def synchronize(connection_id: int,
    idempotency_key: str = Header(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9._:-]+$'),
    service: IntegrationService = Depends(integration_service), actor=Depends(require_permission('INTEGRATION_MANAGE'))):
    return await service.sync(connection_id, idempotency_key, actor.id)


@router.post('/{connection_id}/probe')
async def probe_connection(connection_id: int, service: IntegrationService = Depends(integration_service)):
    return await service.probe(connection_id)


@router.get('/{connection_id}/runs', response_model=list[RunResponse])
def list_runs(connection_id: int, service: IntegrationService = Depends(integration_service)):
    service.get(connection_id)
    return service.repository.list_runs(connection_id)


@router.get('/{connection_id}/records', response_model=list[RecordResponse])
def list_records(connection_id: int, offset: int = Query(default=0, ge=0), limit: int = Query(default=100, ge=1, le=500),
    service: IntegrationService = Depends(integration_service)):
    service.get(connection_id)
    return service.repository.list_records(connection_id, offset, limit)
