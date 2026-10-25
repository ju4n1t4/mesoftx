import asyncio

import httpx
import pytest

from app.application.ports.errors import RemoteServiceError
from app.core.config import get_settings
from app.infrastructure.clients import user_ms_client as module


def test_internal_client_contracts_and_transport_failures(monkeypatch):
    original=httpx.AsyncClient
    calls=[]
    def respond(request):
        calls.append(request)
        assert request.headers['X-Service-Token']==get_settings().service_token
        path=request.url.path
        payload={'periods_id':1}
        if path.endswith('/internal/teacher-subjects'):payload=[111]
        elif path.endswith('/students/count'):payload={'111':2}
        elif path.endswith('/subjects/teachers'):payload={'111':[7]}
        elif path.endswith('/subjects/programs'):payload={'111':'IT1'}
        return httpx.Response(200,json=payload)
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(respond),**kwargs))
    client=module.UserMsClient()
    async def exercise():
        assert await client.user_exists(7)
        assert await client.subject_exists(111)
        assert await client.subject_period(111)==1
        assert await client.period_exists(1)
        assert await client.student_exists(10)
        assert await client.student_enrolled(10,111)
        assert await client.teacher_has_subject(7,111)
        assert await client.teacher_subjects(7)==[111]
        assert await client.enrolled_counts([111])=={111:2}
        assert await client.subjects_teachers([111])=={111:[7]}
        assert await client.subjects_programs([111])=={111:'IT1'}
    asyncio.run(exercise());assert len(calls)==11
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(lambda r:httpx.Response(404,json={})),**kwargs))
    assert asyncio.run(client.subject_period(999)) is None
    def disconnected(request):raise httpx.ConnectError('fixture offline',request=request)
    monkeypatch.setattr(module.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(disconnected),**kwargs))
    with pytest.raises(RemoteServiceError):asyncio.run(client.teacher_subjects(7))
