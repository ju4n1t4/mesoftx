import asyncio
import os
from types import SimpleNamespace

import pytest
from cryptography.fernet import Fernet
from sqlalchemy import select

from app.application.ports.errors import ApplicationError
from app.infrastructure.clients.external_json_client import HttpExternalJsonClient
from app.infrastructure.database.integration_models import IntegrationConnectionModel
from app.infrastructure.security.integration_vault import FernetSecretVault
from test_workflows import request, workflow

pytestmark = pytest.mark.skipif(not os.getenv('MESOFTX_TEST_DATABASE_URL'), reason='requires disposable PostgreSQL')


def test_credentials_encrypted_and_sync_persistent_idempotent(workflow, monkeypatch):
    client,session,actors=workflow
    from app.core.config import get_settings
    settings=get_settings()
    monkeypatch.setattr(settings,'integrations_encryption_key',Fernet.generate_key().decode())
    monkeypatch.setattr(settings,'external_api_allowed_hosts','api.example.org')
    payload={'name':'External fixture','base_url':'https://api.example.org','resource_path':'/students',
        'records_path':'data.items','external_id_field':'code','auth_type':'bearer','secret':'credential-not-for-logs','enabled':True}
    connection=request(client,'POST','/integrations',payload,201)
    assert connection['credential_configured'] is True
    assert 'secret' not in connection and 'encrypted_secret' not in connection
    stored=session.get(IntegrationConnectionModel,connection['id'])
    assert stored.encrypted_secret != payload['secret']
    assert FernetSecretVault(settings.integrations_encryption_key).decrypt(stored.encrypted_secret)==payload['secret']
    calls=[]
    async def fetch(self, connection, secret):
        calls.append(secret)
        return {'data':{'items':[{'code':'A1','name':'First'}]}}
    monkeypatch.setattr(HttpExternalJsonClient,'fetch',fetch)
    id=connection['id']
    request(client,'POST',f'/integrations/{id}/probe')
    run=request(client,'POST',f'/integrations/{id}/sync',headers={'Idempotency-Key':'sync-1'})
    assert run['status']=='succeeded' and run['records_count']==1
    assert request(client,'POST',f'/integrations/{id}/sync',headers={'Idempotency-Key':'sync-1'})['id']==run['id']
    assert len(calls)==2  # probe + one synchronization; idempotent replay never calls provider
    assert request(client,'GET',f'/integrations/{id}/records')[0]['payload']['name']=='First'
    async def changed(self, connection, secret): return {'data':{'items':[{'code':'A1','name':'Updated'}]}}
    monkeypatch.setattr(HttpExternalJsonClient,'fetch',changed)
    request(client,'POST',f'/integrations/{id}/sync',headers={'Idempotency-Key':'sync-2'})
    records=request(client,'GET',f'/integrations/{id}/records')
    assert len(records)==1 and records[0]['payload']['name']=='Updated'
    assert len(request(client,'GET',f'/integrations/{id}/runs'))==2
    request(client,'PATCH',f'/integrations/{id}',{'name':'Updated connection'})
    assert request(client,'GET','/integrations')[0]['name']=='Updated connection'
    request(client,'PATCH',f'/integrations/{id}',{'enabled':False})
    request(client,'POST',f'/integrations/{id}/sync',headers={'Idempotency-Key':'disabled'},expected=409)


def test_sync_validation_is_atomic_and_errors_do_not_expose_secrets(workflow,monkeypatch):
    client,session,_=workflow
    from app.core.config import get_settings
    monkeypatch.setattr(get_settings(),'external_api_allowed_hosts','api.example.org')
    connection=request(client,'POST','/integrations',{'name':'Invalid data fixture','base_url':'https://api.example.org','enabled':True},201)
    id=connection['id']
    async def bad(self, connection, secret): return [{'id':1},{'id':1}]
    monkeypatch.setattr(HttpExternalJsonClient,'fetch',bad)
    request(client,'POST',f'/integrations/{id}/sync',headers={'Idempotency-Key':'bad-1'},expected=502)
    assert request(client,'GET',f'/integrations/{id}/records')==[]
    async def down(self,connection,secret): raise RuntimeError('SECRET_TOKEN_LEAK')
    monkeypatch.setattr(HttpExternalJsonClient,'fetch',down)
    response=client.post(f'/api/v1/integrations/{id}/sync',headers={'Idempotency-Key':'down-1'})
    assert response.status_code==503 and 'SECRET_TOKEN_LEAK' not in response.text
    runs=request(client,'GET',f'/integrations/{id}/runs')
    assert {r['status'] for r in runs}=={'failed'}
    assert all('SECRET_TOKEN_LEAK' not in str(r) for r in runs)
    request(client,'GET','/integrations/9999/records',expected=404)
    request(client,'POST','/integrations',{'name':'Bad origin','base_url':'http://127.0.0.1'},expected=422)
    request(client,'POST','/integrations',{'name':'Missing credential','base_url':'https://api.example.org','auth_type':'bearer'},expected=422)


def test_vault_requires_external_key_and_rejects_wrong_key():
    with pytest.raises(ApplicationError): FernetSecretVault('').encrypt('key')
    vault=FernetSecretVault(Fernet.generate_key().decode())
    secret=vault.encrypt('credential')
    with pytest.raises(ApplicationError): FernetSecretVault(Fernet.generate_key().decode()).decrypt(secret)

@pytest.mark.parametrize('origin,path',[
    ('http://api.example.org','/x'),('https://evil.example.org','/x'),('https://user:pass@api.example.org','/x'),
    ('https://api.example.org:bad-port','/x'),('https://api.example.org:8443','/x'),('https://api.example.org/path','/x'),('https://api.example.org','//evil.example.org'),
    ('https://api.example.org','/path?token=secret'),('https://api.example.org','/path#fragment'),
])
def test_external_client_rejects_unsafe_origins(origin,path):
    with pytest.raises(ApplicationError): HttpExternalJsonClient(['api.example.org']).validate_url(origin,path)


def test_external_http_adapter_enforces_limits_and_server_credentials(monkeypatch):
    import httpx
    from app.infrastructure.clients import external_json_client as module
    original=httpx.AsyncClient
    monkeypatch.setattr(module.socket,'getaddrinfo',lambda *args,**kwargs:[(2,1,6,'',('8.8.8.8',443))])
    captured=[]
    def respond(request):
        captured.append(request)
        return httpx.Response(200,json=[{'id':'A1'}])
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(**{**kwargs,'transport':httpx.MockTransport(respond)}))
    adapter=HttpExternalJsonClient(['api.example.org'])
    for auth in ['none','bearer','api_key']:
        connection=SimpleNamespace(base_url='https://api.example.org',resource_path='/items',auth_type=auth)
        assert asyncio.run(adapter.fetch(connection,'server-only-secret'))==[{'id':'A1'}]
    assert captured[1].headers['Authorization']=='Bearer server-only-secret'
    assert captured[2].headers['X-API-Key']=='server-only-secret'
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(**{**kwargs,'transport':httpx.MockTransport(lambda request:httpx.Response(200,content=b'x'*(2*1024*1024+1)))}))
    with pytest.raises(ApplicationError):asyncio.run(adapter.fetch(connection,'secret'))
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(**{**kwargs,'transport':httpx.MockTransport(lambda request:httpx.Response(200,content=b'not JSON'))}))
    with pytest.raises(ApplicationError):asyncio.run(adapter.fetch(connection,'secret'))
    monkeypatch.setattr(module.socket,'getaddrinfo',lambda *args,**kwargs:[(2,1,6,'',('127.0.0.1',443))])
    with pytest.raises(ApplicationError):asyncio.run(adapter.fetch(connection,'secret'))


def test_key_rotation_and_interrupted_run_recovery_preserve_records(workflow,monkeypatch):
    from contextlib import contextmanager
    from datetime import datetime,timedelta,timezone
    from app.core.config import get_settings
    from app.infrastructure.repositories.integration_repository import SqlIntegrationRepository
    from app.infrastructure.database.integration_models import IntegrationRunModel
    from app.tools import rotate_integration_secrets
    client,session,_=workflow
    previous,current=Fernet.generate_key().decode(),Fernet.generate_key().decode()
    settings=get_settings();monkeypatch.setattr(settings,'external_api_allowed_hosts','api.example.org')
    monkeypatch.setattr(settings,'integrations_encryption_key',previous)
    connection=request(client,'POST','/integrations',{'name':'Rotation fixture','base_url':'https://api.example.org',
        'auth_type':'bearer','secret':'persisted-private-credential','enabled':True},201)
    monkeypatch.setattr(settings,'integrations_encryption_key',current)
    monkeypatch.setattr(settings,'integrations_previous_keys',previous)
    @contextmanager
    def scoped():yield session
    monkeypatch.setattr(rotate_integration_secrets,'SessionLocal',scoped)
    assert rotate_integration_secrets.main()==0
    stored=session.get(IntegrationConnectionModel,connection['id'])
    assert FernetSecretVault(current).decrypt(stored.encrypted_secret)=='persisted-private-credential'
    with pytest.raises(ApplicationError):FernetSecretVault(previous).decrypt(stored.encrypted_secret)
    repository=SqlIntegrationRepository(session)
    pending,_=repository.start_run(connection['id'],'interrupted',1)
    with pytest.raises(ApplicationError):repository.start_run(connection['id'],'parallel',1)
    pending=session.get(IntegrationRunModel,pending.id);pending.started_at=datetime.now(timezone.utc)-timedelta(minutes=11);session.commit()
    async def fetch(self,connection,secret):return [{'id':'A1','value':'Preserved'}]
    monkeypatch.setattr(HttpExternalJsonClient,'fetch',fetch)
    result=request(client,'POST',f"/integrations/{connection['id']}/sync",headers={'Idempotency-Key':'recovered'})
    assert result['status']=='succeeded'
    runs=request(client,'GET',f"/integrations/{connection['id']}/runs")
    assert any(run['error_code']=='interrupted' for run in runs)
    assert request(client,'GET',f"/integrations/{connection['id']}/records")[0]['payload']['value']=='Preserved'
