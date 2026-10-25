"""Authenticated workflows against disposable PostgreSQL; rollback leaves bootstrap intact."""
import asyncio
import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from app.infrastructure.clients.assesment_ms_client import AssesmentMsClient
from app.infrastructure.repositories import sqlalchemy_repositories as repos
from app.interfaces.api.v1 import dependencies as deps
from app.main import app

pytestmark = pytest.mark.skipif(not os.getenv('MESOFTX_TEST_DATABASE_URL'), reason='requires disposable PostgreSQL')

@pytest.fixture
def workflow(monkeypatch):
    engine = create_engine(os.environ['MESOFTX_TEST_DATABASE_URL'])
    connection = engine.connect()
    tx = connection.begin()
    session = Session(bind=connection, join_transaction_mode='create_savepoint')
    actor = repos.UserRepository(session).get_by_id(1)
    actor.permissions = [p.code for p in repos.PermissionRepository(session).list_all()]
    actors = {'current': actor}
    app.dependency_overrides[deps.db_session] = lambda: session
    app.dependency_overrides[deps.get_current_user] = lambda: actors['current']
    async def delete_rubrics(self, **kwargs): return True, []
    async def delete_subjects(self, subjects_id): return None
    monkeypatch.setattr(AssesmentMsClient, 'delete_rubrics', delete_rubrics)
    monkeypatch.setattr(AssesmentMsClient, 'delete_schedule_subjects', delete_subjects)
    with TestClient(app) as client:
        yield client, session, actors
    app.dependency_overrides.clear()
    session.close()
    tx.rollback()
    connection.close()
    engine.dispose()


def request(client, method, path, payload=None, expected=200, **kwargs):
    response = client.request(method, '/api/v1'+path, json=payload, **kwargs)
    assert response.status_code == expected, (path, response.status_code, response.text)
    return response.json() if response.content else None


def masters(client):
    college = request(client, 'POST', '/colleges', {'id':'IT1','name':'Engineering fixture'}, 201)
    program = request(client, 'POST', '/programs', {'id':'IT1','name':'Software fixture','college_id':college['id']}, 201)
    period = request(client, 'POST', '/periods', {'code':'202610'}, 201)
    subject = request(client, 'POST', '/subjects', {'nrc':111,'materia_curso':'SWE101','name':'Architecture','periods_id':period['id'],'program_id':program['id']}, 201)
    return college, program, period, subject


def test_catalog_lifecycle_preserves_relations_and_active_period(workflow):
    client, session, _ = workflow
    college, program, period, subject = masters(client)
    for resource, entity, changes in [('colleges',college,{'name':'Updated college'}),('programs',program,{'accredited':True}),('periods',period,{'active':True}),('subjects',subject,{'name':'Updated subject'})]:
        key=entity.get('id',entity.get('nrc'))
        assert request(client,'GET','/'+resource)
        request(client,'GET',f'/{resource}/{key}')
        result=request(client,'PUT',f'/{resource}/{key}',changes)
        for field,value in changes.items(): assert result[field] == value
    second=request(client,'POST','/periods',{'code':'202660','active':True},201)
    assert sum(p['active'] for p in request(client,'GET','/periods')) == 1
    request(client,'PUT',f"/periods/{second['id']}",{'active':False})
    assert repos.SubjectRepository(session).list_by_program(program['id'])[0].nrc == 111
    request(client,'DELETE','/subjects/111',expected=204)
    request(client,'DELETE',f"/programs/{program['id']}",expected=204)
    request(client,'DELETE',f"/colleges/{college['id']}",expected=204)
    request(client,'DELETE',f"/periods/{second['id']}",expected=204)
    assert sum(p['active'] for p in request(client,'GET','/periods')) == 1
    request(client,'DELETE','/subjects/999999',expected=404)
    request(client,'GET','/programs/ZZZ',expected=404)


def test_roles_permissions_and_users_are_managed_without_privilege_escalation(workflow):
    client, session, actors=workflow
    _,program,_,_=masters(client)
    role=request(client,'POST','/roles',{'name':'Profesor'},201)
    request(client,'PUT',f"/roles/{role['id']}",{'description':'Fixture teacher'})
    permissions=request(client,'GET','/permissions')
    assert len(permissions)>=18
    request(client,'PUT',f"/roles/{role['id']}/permissions",{'permission_codes':['MY_COURSES_VIEW','STUDENT_UPLOAD']})
    assert set(request(client,'GET',f"/roles/{role['id']}/permissions")) == {'MY_COURSES_VIEW','STUDENT_UPLOAD'}
    user=request(client,'POST','/users',{'document_number':'FIXTURE01','name':'Teacher','email':'TEACHER@EXAMPLE.ORG','password':'A-secure-fixture-2026','role_id':role['id'],'program_id':program['id']},201)
    assert user['email']=='teacher@example.org'
    assert any(u['id']==user['id'] for u in request(client,'GET','/users'))
    request(client,'GET',f"/users/{user['id']}")
    request(client,'PUT',f"/users/{user['id']}",{'name':'Teacher updated','password':'New-password-fixture-2026'})
    assert request(client,'PATCH',f"/users/{user['id']}/deactivate")['active'] is False
    assert request(client,'PATCH',f"/users/{user['id']}/activate")['active'] is True
    request(client,'DELETE',f"/roles/{role['id']}",expected=409)
    request(client,'DELETE',f"/users/{user['id']}",expected=204)
    request(client,'DELETE',f"/roles/{role['id']}",expected=204)
    request(client,'DELETE','/roles/99999',expected=404)
    assert repos.UserRepository(session).get_by_email('teacher@example.org') is None


def test_teacher_enrollment_deduplicates_students_and_scope(workflow):
    client,session,actors=workflow
    _,program,period,_=masters(client)
    role=request(client,'POST','/roles',{'name':'Profesor'},201)
    teacher=request(client,'POST','/users',{'document_number':'TEACHER02','name':'Teacher','email':'teacher2@example.org','password':'A-secure-fixture-2026','role_id':role['id'],'program_id':program['id']},201)
    assignment=request(client,'POST','/teacher-subjects',{'user_id':teacher['id'],'subjects_id':111},201)
    assert request(client,'GET',f"/teacher-subjects?user_id={teacher['id']}")
    actor=repos.UserRepository(session).get_by_id(teacher['id']);actor.permissions=['MY_COURSES_VIEW','STUDENT_UPLOAD','TEACHER_CRUD'];actors['current']=actor
    assert request(client,'GET','/me/subjects/pending')[0]['nrc']==111
    assert request(client,'GET','/me/subjects')[0]['nrc']==111
    rows={'students':[{'document_number':'ST001','name':'Student One'},{'document_number':'ST002','name':'Student Two'}]}
    assert request(client,'POST','/subjects/111/students',rows,201)=={'created':2,'already_existed':0,'enrolled':2}
    assert request(client,'POST','/subjects/111/students',rows,201)=={'created':0,'already_existed':2,'enrolled':0}
    assert request(client,'GET','/me/subjects/pending')==[]
    students=request(client,'GET','/subjects/111/students');assert len(students)==2
    student=students[0]
    request(client,'GET','/subjects/99999/students',expected=404)
    request(client,'GET','/students?document=ST&name=One')
    request(client,'PUT',f"/students/{student['id']}",{'name':'Updated student'})
    headers={'X-Service-Token':os.environ['SERVICE_TOKEN']}
    for path in [f"/students/{student['id']}",f"/internal/users/{teacher['id']}",'/internal/subjects/111',f"/internal/periods/{period['id']}",f"/subjects/111/students/{student['id']}",f"/teacher-subjects/{teacher['id']}/111",f"/internal/teacher-subjects?user_id={teacher['id']}"]:
        request(client,'GET',path,headers=headers)
    for path in ['/internal/subjects/students/count','/internal/subjects/teachers','/internal/subjects/programs']:
        request(client,'POST',path,{'nrcs':[111]},headers=headers)
    assert repos.EnrollmentRepository(session).counts_for_nrcs([])=={}
    assert repos.SubjectRepository(session).programs_for_nrcs([])=={}
    assert repos.TeacherSubjectRepository(session).teachers_for_nrcs([])=={}
    request(client,'DELETE',f"/students/{student['id']}",expected=204)
    request(client,'DELETE',f"/teacher-subjects/{assignment['id']}",expected=403)
    admin=repos.UserRepository(session).get_by_id(1);admin.permissions=['SUBJECT_CRUD'];actors['current']=admin
    request(client,'DELETE',f"/teacher-subjects/{assignment['id']}",expected=204)
    assert not repos.TeacherSubjectRepository(session).has_subject(teacher['id'],111)


def test_self_password_rotation_and_duplicate_constraints(workflow):
    client,session,actors=workflow
    request(client,'POST','/me/password',{'current_password':'wrong','new_password':'Secure-new-password-2026'},expected=400)
    request(client,'POST','/me/password',{'current_password':'Mesoftx2026!','new_password':'Secure-new-password-2026'},expected=204)
    from app.infrastructure.security.password_service import verify_password
    assert verify_password('Secure-new-password-2026',repos.UserRepository(session).get_by_id(1).password)
    request(client,'POST','/colleges',{'id':'IT1','name':'Engineering fixture'},201)
    request(client,'POST','/colleges',{'id':'IT2','name':'Engineering fixture'},409)
    request(client,'GET','/colleges/IT1')


def test_demo_provisioning_is_repeatable_and_password_rotation_tool(workflow,monkeypatch,capsys):
    from contextlib import contextmanager
    from app.tools import seed_demo,set_password
    from app.core.demo_accounts import DEMO_ROLES,demo_email
    from app.core.config import get_settings
    from app.infrastructure.security.jwt_service import create_access_token
    client,session,_=workflow
    masters(client)
    @contextmanager
    def scoped():yield session
    monkeypatch.setattr(seed_demo,'SessionLocal',scoped)
    monkeypatch.setattr(seed_demo.sys,'argv',['seed_demo','--program-id','IT1'])
    assert seed_demo.main()==0
    first={key:repos.UserRepository(session).get_by_email(demo_email(key)).id for key in DEMO_ROLES}
    assert len(set(first.values()))==4
    assert seed_demo.main()==0
    assert {key:repos.UserRepository(session).get_by_email(demo_email(key)).id for key in DEMO_ROLES}==first
    assert 'password' not in capsys.readouterr().out.lower()
    monkeypatch.setattr(set_password,'SessionLocal',scoped)
    monkeypatch.setattr(set_password.sys,'argv',['set_password','admin@unab.edu.co'])
    monkeypatch.setattr(set_password.getpass,'getpass',lambda prompt:'Updated-command-fixture-2026')
    assert set_password.main()==0
    token=create_access_token('1')
    assert deps.get_current_user(token,session).id==1
    from app.infrastructure.database.session import get_db
    generator=get_db();assert next(generator) is not None;generator.close()
    monkeypatch.setattr(seed_demo.sys,'argv',['seed_demo','--remove'])
    assert seed_demo.main()==0
    assert all(repos.UserRepository(session).get_by_email(demo_email(key)) is None for key in DEMO_ROLES)


def test_administrator_can_manage_coordinators_but_not_elevate_or_edit_self(workflow):
    client, session, actors = workflow
    role = request(client, 'POST', '/roles', {'name':'Coordinador'}, 201)
    user = request(client, 'POST', '/users', {'document_number':'COORD01','name':'Coordinator','email':'coord@example.org',
        'password':'Coordinator-fixture-2026','role_id':role['id']}, 201)
    actors['current'].permissions = ['USER_CRUD']
    request(client, 'PUT', f"/users/{user['id']}", {'name':'Coordinator updated'})
    request(client, 'PATCH', f"/users/{user['id']}/deactivate")
    request(client, 'PATCH', f"/users/{user['id']}/activate")
    request(client, 'PUT', '/users/1', {'name':'Self edit forbidden'}, expected=403)
    request(client, 'DELETE', f"/users/{user['id']}", expected=204)
