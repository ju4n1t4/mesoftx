import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.infrastructure.clients.user_ms_client import UserMsClient
from app.infrastructure.repositories import sqlalchemy_repositories as repos
from app.interfaces.api.v1 import dependencies as deps
from app.main import app

pytestmark=pytest.mark.skipif(not os.getenv('MESOFTX_TEST_DATABASE_URL'),reason='requires disposable PostgreSQL')

@pytest.fixture
def workflow(monkeypatch):
    engine=create_engine(os.environ['MESOFTX_TEST_DATABASE_URL']);connection=engine.connect();tx=connection.begin()
    session=Session(bind=connection,join_transaction_mode='create_savepoint')
    actor=deps.CurrentUser(7,2,'fixture@example.org','Coordinador',None,[
        'SO_CRUD','INDICATOR_VIEW','SO_TO_ASSESS_VIEW','SO_SCHEDULE_MANAGE','RUBRIC_VIEW','RUBRIC_FILL',
        'EVIDENCE_UPLOAD','DASHBOARD_PROGRAM','DASHBOARD_SO','DASHBOARD_TEACHER','INDICATOR_CHART'])
    app.dependency_overrides[deps.db_session]=lambda:session
    app.dependency_overrides[deps.get_current_user]=lambda:actor
    async def yes(self,*args):return True
    async def period(self,nrc):return 1
    async def teacher_nrcs(self,user_id):return [111]
    async def counts(self,nrcs):return {111:2}
    async def teachers(self,nrcs):return {111:[7]}
    async def programs(self,nrcs):return {111:'IT1'}
    for name in ['period_exists','teacher_has_subject','student_enrolled','user_exists','subject_exists','student_exists']:monkeypatch.setattr(UserMsClient,name,yes)
    monkeypatch.setattr(UserMsClient,'subject_period',period);monkeypatch.setattr(UserMsClient,'teacher_subjects',teacher_nrcs)
    monkeypatch.setattr(UserMsClient,'enrolled_counts',counts);monkeypatch.setattr(UserMsClient,'subjects_teachers',teachers);monkeypatch.setattr(UserMsClient,'subjects_programs',programs)
    with TestClient(app) as client:yield client,session,actor
    app.dependency_overrides.clear();session.close();tx.rollback();connection.close();engine.dispose()


def request(client,method,path,payload=None,expected=200,**kwargs):
    response=client.request(method,'/api/v1'+path,json=payload,**kwargs)
    assert response.status_code==expected,(path,response.status_code,response.text)
    return response.json() if response.content else None


def masters(client):
    so=request(client,'POST','/so',{'id':'SO1','description':'Outcome fixture','college_id':'IT1'},201)
    perf=request(client,'POST','/performance',{'id':'1','description':'Indicator fixture','so_id':'SO1'},201)
    for rank in range(1,5):
        request(client,'POST','/level',{'id':f'L{rank}','description':f'Level {rank}','rank':rank,'performance_id':perf['id']},201)
    sched=request(client,'POST','/so-schedule',{'so_id':'SO1','period_id':1},201)
    request(client,'PUT',f"/so-schedule/{sched['id']}/subjects",{'nrcs':[111]})
    return so,perf,sched


def test_assessment_lifecycle_ownership_closed_history_and_dashboards(workflow):
    client,session,actor=workflow
    so,perf,sched=masters(client);sid=sched['id']
    request(client,'GET','/so');request(client,'PUT','/so/SO1',{'description':'Updated outcome'})
    request(client,'GET','/performance?so_id=SO1');request(client,'PUT',f"/performance/{perf['id']}",{'description':'Updated indicator'})
    request(client,'GET',f"/performance/{perf['id']}/levels");request(client,'PUT','/level/L1',{'description':'Updated level'})
    request(client,'GET',f'/so-schedule/{sid}/subjects');request(client,'GET','/so-schedule');request(client,'GET','/so-schedule?period_id=1')
    request(client,'GET','/period-target/1',expected=404)
    request(client,'PUT','/period-target/1',{'target_pct':80});request(client,'PUT','/period-target/1',{'target_pct':85})
    assert request(client,'GET','/period-target/1')['target_pct']==85
    payload={'schedule_id':sid,'student_id':10,'subjects_id':111,'performance_id':perf['id'],'level_id':'L4'}
    request(client,'POST','/rubric',payload,409)
    request(client,'PATCH',f'/so-schedule/{sid}/status',{'status':'EN_CURSO'})
    actor.program_id='IT1'
    assert request(client,'GET','/so-schedule/current')
    assert request(client,'GET','/so-schedule?period_id=1')
    assert request(client,'GET','/me/assessments')[0]['nrc']==111
    evidence=request(client,'POST','/evidence',{'schedule_id':sid,'subjects_id':111,'student_id':10,'name':'Evidence','file_url':'https://storage.example.org/file'},201)
    rubric=request(client,'POST','/rubric',{**payload,'evidence_id':evidence['id']},201)
    assert request(client,'GET',f'/rubric?period_id=1&schedule_id={sid}&subjects_id=111&student_id=10')
    request(client,'POST','/rubric',payload,409)
    request(client,'PUT',f"/rubric/{rubric['id']}",{'level_id':'L3'})
    request(client,'PATCH',f'/so-schedule/{sid}/status',{'status':'PLANIFICADO'},409)
    for path in ['/dashboard/program?period_id=1','/dashboard/so?period_id=1','/dashboard/teacher?period_id=1','/indicators/chart?period_id=1']:
        assert request(client,'GET',path)['period_id']==1
    public=request(client,'GET','/public/indicators');assert public['items'][0]['suppressed'] is True
    request(client,'PATCH',f'/so-schedule/{sid}/status',{'status':'CERRADO'})
    request(client,'PUT',f"/rubric/{rubric['id']}",{'level_id':'L2'},409)
    for path in ['/so/SO1',f"/performance/{perf['id']}",'/level/L3',f'/so-schedule/{sid}']:
        request(client,'DELETE',path,expected=409)
    request(client,'PUT','/period-target/1',{'target_pct':90},409)
    headers={'X-Service-Token':os.environ['SERVICE_TOKEN']}
    for path in ['/internal/rubric?student_id=10','/internal/so-schedule?period_id=1','/internal/so?college_id=IT1']:
        request(client,'DELETE',path,headers=headers,expected=409)
    assert repos.PerformanceRepository(session).count_by_so('SO1')==1
    assert repos.SoScheduleRepository(session).list_current()==[]
    assert repos.RubricRepository(session).list_by_period(1)
    request(client,'PATCH',f'/so-schedule/{sid}/status',{'status':'EN_CURSO'})
    assert request(client,'DELETE','/internal/rubric',headers=headers)=={'deleted':0}
    assert request(client,'DELETE','/internal/rubric?student_id=10',headers=headers)['deleted']==1
    request(client,'DELETE','/internal/schedule-subjects?subjects_id=111',headers=headers)
    request(client,'DELETE','/internal/so-schedule?period_id=1',headers=headers)
    request(client,'DELETE','/internal/so?college_id=IT1',headers=headers)
    assert request(client,'GET','/so')==[]


def test_delete_catalogs_and_schedule_without_rubrics_and_invalid_references(workflow,monkeypatch):
    client,session,actor=workflow
    so,perf,sched=masters(client);sid=sched['id']
    request(client,'PATCH',f'/so-schedule/{sid}/status',{'status':'EN_CURSO'})
    request(client,'PATCH',f'/so-schedule/{sid}/status',{'status':'PLANIFICADO'})
    request(client,'DELETE','/level/L1',expected=204)
    request(client,'DELETE',f"/performance/{perf['id']}",expected=204)
    request(client,'DELETE',f'/so-schedule/{sid}',expected=204)
    request(client,'DELETE','/so/SO1',expected=204)
    request(client,'DELETE','/so/ZZZ',expected=404)
    request(client,'PUT','/so/ZZZ',{'description':'No outcome'},404)
    request(client,'DELETE','/level/ZZZ',expected=404)
    request(client,'PUT','/level/ZZZ',{'description':'No level'},404)
    request(client,'PUT','/performance/ZZZ',{'description':'No performance'},404)
    request(client,'DELETE','/performance/ZZZ',expected=404)
    request(client,'GET','/so-schedule/99999/subjects',expected=404)
    request(client,'POST','/performance',{'id':'x','description':'Invalid parent','so_id':'NONE'},expected=422)
    async def no_subjects(self,user_id):return []
    monkeypatch.setattr(UserMsClient,'teacher_subjects',no_subjects);actor.program_id='IT1'
    assert request(client,'GET','/so-schedule')==[]
    assert request(client,'GET','/so-schedule/current')==[]
    assert request(client,'GET','/me/assessments')==[]
    assert request(client,'GET','/rubric')==[]
