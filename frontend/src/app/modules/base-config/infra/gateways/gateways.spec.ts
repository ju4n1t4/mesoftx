import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { UserApiService } from './user-api.service';
import { AssesmentApiService } from './assesment-api.service';
import { HttpIntegrationsGateway } from './http-integrations.gateway';
import { environment } from '../../../../../environments/environment';

type Contract = [string, unknown[], string, string];
const userContracts: Contract[] = [
 ['getUsers',[],'get','/users'],['getUser',[7],'get','/users/7'],['createUser',[{name:'Teacher'}],'post','/users'],['updateUser',[7,{name:'Updated'}],'put','/users/7'],
 ['activateUser',[7],'patch','/users/7/activate'],['deactivateUser',[7],'patch','/users/7/deactivate'],['getRoles',[],'get','/roles'],['createRole',[{name:'Profesor'}],'post','/roles'],
 ['updateRole',[2,{name:'Profesor'}],'put','/roles/2'],['deleteRole',[2],'delete','/roles/2'],['setRolePermissions',[2,['RUBRIC_VIEW']],'put','/roles/2/permissions'],['getRolePermissions',[2],'get','/roles/2/permissions'],
 ['changeMyPassword',['old','new'],'post','/me/password'],['getPermissions',[],'get','/permissions'],['getPrograms',[],'get','/programs'],['getProgram',['IT1'],'get','/programs/IT1'],
 ['createProgram',[{id:'IT1'}],'post','/programs'],['updateProgram',['IT1',{name:'Updated'}],'put','/programs/IT1'],['deleteProgram',['IT1'],'delete','/programs/IT1'],
 ['getSubjects',[],'get','/subjects'],['getSubject',[111],'get','/subjects/111'],['createSubject',[{nrc:111}],'post','/subjects'],['updateSubject',[111,{name:'Updated'}],'put','/subjects/111'],['deleteSubject',[111],'delete','/subjects/111'],
 ['assignTeacherSubject',[{user_id:7,subjects_id:111}],'post','/teacher-subjects'],['getTeacherSubjects',[7],'get','/teacher-subjects'],['deleteTeacherSubject',[1],'delete','/teacher-subjects/1'],
 ['getMySubjects',[],'get','/me/subjects'],['getMyPendingSubjects',[],'get','/me/subjects/pending'],['uploadStudents',[111,[{name:'Student'}]],'post','/subjects/111/students'],['getSubjectStudents',[111],'get','/subjects/111/students'],
 ['getColleges',[],'get','/colleges'],['getCollege',['IT1'],'get','/colleges/IT1'],['createCollege',[{id:'IT1'}],'post','/colleges'],['updateCollege',['IT1',{name:'Updated'}],'put','/colleges/IT1'],['deleteCollege',['IT1'],'delete','/colleges/IT1'],
 ['getPeriods',[],'get','/periods'],['getPeriod',[1],'get','/periods/1'],['createPeriod',[{code:'202610'}],'post','/periods'],['updatePeriod',[1,{active:true}],'put','/periods/1'],['deletePeriod',[1],'delete','/periods/1'],
];
const assessmentContracts: Contract[] = [
 ['getPublicIndicators',[],'get','/public/indicators'],['getStudentOutcomes',[],'get','/so'],['createStudentOutcome',[{id:'SO1'}],'post','/so'],['updateStudentOutcome',['SO1',{description:'Updated'}],'put','/so/SO1'],['deleteStudentOutcome',['SO1'],'delete','/so/SO1'],
 ['getPerformances',['SO1'],'get','/performance'],['createPerformance',[{id:'P1'}],'post','/performance'],['updatePerformance',['P1',{description:'Updated'}],'put','/performance/P1'],['deletePerformance',['P1'],'delete','/performance/P1'],
 ['getLevels',['P1'],'get','/performance/P1/levels'],['createLevel',[{id:'L1'}],'post','/level'],['updateLevel',['L1',{description:'Updated'}],'put','/level/L1'],['deleteLevel',['L1'],'delete','/level/L1'],
 ['getSoSchedules',[1],'get','/so-schedule'],['createSoSchedule',[{so_id:'SO1',period_id:1}],'post','/so-schedule'],['deleteSoSchedule',[1],'delete','/so-schedule/1'],['setScheduleSubjects',[1,[111]],'put','/so-schedule/1/subjects'],['getScheduleSubjects',[1],'get','/so-schedule/1/subjects'],
 ['patchScheduleStatus',[1,'EN_CURSO'],'patch','/so-schedule/1/status'],['getPeriodTarget',[1],'get','/period-target/1'],['updatePeriodTarget',[1,85],'put','/period-target/1'],['getMyAssessments',[],'get','/me/assessments'],
 ['createRubric',[{schedule_id:1}],'post','/rubric'],['getRubrics',[{period_id:1,schedule_id:2,subjects_id:111}],'get','/rubric'],['getIndicatorsChart',[1],'get','/indicators/chart'],['getDashboardProgram',[1],'get','/dashboard/program'],['getDashboardSo',[1],'get','/dashboard/so'],['getDashboardTeacher',[1],'get','/dashboard/teacher'],
];
function http() {return { get:vi.fn(()=>of([])),post:vi.fn(()=>of({})),put:vi.fn(()=>of({})),patch:vi.fn(()=>of({})),delete:vi.fn(()=>of({})) };}

describe('Existing REST contracts',()=>{
 for(const [Class,base,contracts] of [[UserApiService,environment.userApiUrl,userContracts],[AssesmentApiService,environment.assesmentApiUrl,assessmentContracts]] as const){
  it.each(contracts)('%s uses the agreed HTTP verb and backend path',(name,args,verb,path)=>{
   const client=http();const gateway=new Class(client as never) as unknown as Record<string,(...args:unknown[])=>unknown>;
   gateway[name](...args);expect(client[verb as keyof typeof client].mock.calls[0][0]).toBe(base+path);
  });
 }
 it('sends payloads and query parameters rather than embedding connection details in UI',()=>{
  const client=http();const users=new UserApiService(client as never);const assessments=new AssesmentApiService(client as never);
  users.setRolePermissions(7,['RUBRIC_VIEW']);expect(client.put).toHaveBeenLastCalledWith(`${environment.userApiUrl}/roles/7/permissions`,{permission_codes:['RUBRIC_VIEW']});
  users.uploadStudents(111,[{document_number:'S1',name:'Student'}]);expect(client.post).toHaveBeenLastCalledWith(`${environment.userApiUrl}/subjects/111/students`,{students:[{document_number:'S1',name:'Student'}]});
  assessments.getRubrics({period_id:1,schedule_id:2,subjects_id:111});const params=(client.get.mock.lastCall?.[1] as {params:import('@angular/common/http').HttpParams}).params;
  expect(params.get('period_id')).toBe('1');expect(params.get('schedule_id')).toBe('2');expect(params.get('subjects_id')).toBe('111');
  assessments.getSoSchedules();assessments.getRubrics();
 });
 it('centralizes external connection management and sends idempotency keys',()=>{
  const client=http();const gateway=new HttpIntegrationsGateway(client as never);const draft={name:'Fixture',base_url:'https://api.example.org',resource_path:'/items',records_path:'',external_id_field:'id',auth_type:'none' as const,enabled:false};
  gateway.list();gateway.create(draft);gateway.update(1,{enabled:true});gateway.probe(1);gateway.sync(1,'sync-one');gateway.runs(1);gateway.records(1);gateway.records(1,100);
  expect(client.post).toHaveBeenCalledWith(`${environment.userApiUrl}/integrations/1/sync`,{}, {headers:{'Idempotency-Key':'sync-one'}});
  expect(client.get).toHaveBeenLastCalledWith(`${environment.userApiUrl}/integrations/1/records`,{params:{offset:100,limit:100}});
 });
});
