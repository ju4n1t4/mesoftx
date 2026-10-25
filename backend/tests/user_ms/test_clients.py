import asyncio

import httpx
import pytest

from app.application.ports.errors import RemoteServiceError
from app.core.config import get_settings
from app.infrastructure.clients import assesment_ms_client as module


def test_assessment_client_preserves_closed_periods_and_translates_errors(monkeypatch):
    original=httpx.AsyncClient
    def respond(request):
        assert request.headers['X-Service-Token']==get_settings().service_token
        return httpx.Response(200,json={'deleted':1})
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(respond),**kwargs))
    client=module.AssesmentMsClient()
    async def exercise():
        assert await client.delete_rubrics(student_id=10)==(True,[])
        await client.delete_schedule_subjects(111)
        assert await client.delete_so_schedule_by_period(1)==(True,[])
        assert await client.delete_so_by_college('IT1')==(True,[])
    asyncio.run(exercise())
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(lambda r:httpx.Response(409,json={'closed_periods':['1']})),**kwargs))
    async def conflict():
        for operation in [client.delete_rubrics(student_id=10),client.delete_so_schedule_by_period(1),client.delete_so_by_college('IT1')]:assert await operation==(False,['1'])
    asyncio.run(conflict())
    def disconnected(request):raise httpx.ConnectError('fixture offline',request=request)
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(disconnected),**kwargs))
    with pytest.raises(RemoteServiceError):asyncio.run(client.delete_schedule_subjects(111))
