import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { BulkExcelService } from '../app/shared/services/bulk-excel.service';

export const college={id:'IT1',name:'Engineering',active:true};
export const program={id:'IT1',name:'Software',college_id:'IT1',accredited:true,accreditation_end_year:2030,active:true};
export const period={id:1,code:'202610',active:true};
export const subject={nrc:111,materia_curso:'SWE101',name:'Architecture',periods_id:1,program_id:'IT1'};
export const teacher={id:7,name:'Teacher Example',email:'teacher@example.org',document_number:'T01',role_id:3,role:'Profesor',program_id:'IT1',active:true,permissions:['RUBRIC_FILL']};
export const student={id:10,document_number:'S001',name:'Student Example',program_id:'IT1'};
export const outcome={id:'SO1',description:'Outcome One',college_id:'IT1'};
export const performance={id:'P1',code:'1',description:'Indicator One',so_id:'SO1'};
export const levels=[1,2,3,4].map(rank=>({id:`L${rank}`,description:`Level ${rank}`,rank,performance_id:'P1'}));
export const schedule={id:1,so_id:'SO1',period_id:1,status:'EN_CURSO' as const,created_by:1,updated_by:null};
export const assessment={schedule_id:1,so_id:'SO1',description:'Outcome One',nrc:111,period_id:1};
export const rubric={id:1,schedule_id:1,evaluator_user_id:7,student_id:10,subjects_id:111,performance_id:'P1',level_id:'L4',evidence_id:null};
export const connection={id:1,name:'Provider fixture',base_url:'https://api.example.org',resource_path:'/items',records_path:'',external_id_field:'id',auth_type:'none' as const,enabled:true,credential_configured:false,created_at:'2026-10-24T00:00:00Z',updated_at:'2026-10-24T00:00:00Z'};
export const run={id:1,connection_id:1,status:'succeeded',records_count:1,error_code:null,started_at:'2026-10-24T00:00:00Z',finished_at:'2026-10-24T00:00:00Z'};
export const failed=(status=503,detail='Fixture failure')=>throwError(()=>({status,error:{detail}}));
export const fileEvent=()=>({target:{files:[new File(['fixture'],'fixture.xlsx')],value:'fixture.xlsx'}} as unknown as Event);
export function fixtures(){
 const roles=[{id:1,name:'Administrativo'},{id:2,name:'Coordinador'},{id:3,name:'Profesor'},{id:4,name:'Auditor'}];
 const permissions=['MY_COURSES_VIEW','STUDENT_UPLOAD','RUBRIC_FILL','RUBRIC_VIEW','SO_CRUD','USER_CRUD','PERMISSION_ASSIGN','DASHBOARD_SO'].map((code,index)=>({id:index+1,code,name:code}));
 const api={
  getUsers:vi.fn(()=>of([teacher])),getUser:vi.fn(()=>of(teacher)),createUser:vi.fn(()=>of(teacher)),updateUser:vi.fn(()=>of(teacher)),activateUser:vi.fn(()=>of(teacher)),deactivateUser:vi.fn(()=>of({...teacher,active:false})),
  getRoles:vi.fn(()=>of(roles)),createRole:vi.fn(()=>of(roles[2])),updateRole:vi.fn(()=>of(roles[2])),deleteRole:vi.fn(()=>of(undefined)),setRolePermissions:vi.fn(()=>of(roles[2])),getRolePermissions:vi.fn(()=>of(['RUBRIC_VIEW'])),getPermissions:vi.fn(()=>of(permissions)),changeMyPassword:vi.fn(()=>of(undefined)),
  getPrograms:vi.fn(()=>of([program])),getProgram:vi.fn(()=>of(program)),createProgram:vi.fn(()=>of(program)),updateProgram:vi.fn(()=>of(program)),deleteProgram:vi.fn(()=>of(undefined)),
  getSubjects:vi.fn(()=>of([subject])),getSubject:vi.fn(()=>of(subject)),createSubject:vi.fn(()=>of(subject)),updateSubject:vi.fn(()=>of(subject)),deleteSubject:vi.fn(()=>of(undefined)),
  assignTeacherSubject:vi.fn(()=>of({id:1,user_id:7,subjects_id:111})),getTeacherSubjects:vi.fn(()=>of([{id:1,user_id:7,subjects_id:111,...subject}])),deleteTeacherSubject:vi.fn(()=>of(undefined)),
  getMySubjects:vi.fn(()=>of([subject])),getMyPendingSubjects:vi.fn(()=>of([subject])),getSubjectStudents:vi.fn(()=>of([student])),uploadStudents:vi.fn(()=>of({created:1,already_existed:0,enrolled:1})),
  getColleges:vi.fn(()=>of([college])),getCollege:vi.fn(()=>of(college)),createCollege:vi.fn(()=>of(college)),updateCollege:vi.fn(()=>of(college)),deleteCollege:vi.fn(()=>of(undefined)),
  getPeriods:vi.fn(()=>of([period])),getPeriod:vi.fn(()=>of(period)),createPeriod:vi.fn(()=>of(period)),updatePeriod:vi.fn(()=>of(period)),deletePeriod:vi.fn(()=>of(undefined)),
 };
 const assesment={
  getStudentOutcomes:vi.fn(()=>of([outcome])),createStudentOutcome:vi.fn(()=>of(outcome)),updateStudentOutcome:vi.fn(()=>of(outcome)),deleteStudentOutcome:vi.fn(()=>of(undefined)),
  getPerformances:vi.fn(()=>of([performance])),createPerformance:vi.fn(()=>of(performance)),updatePerformance:vi.fn(()=>of(performance)),deletePerformance:vi.fn(()=>of(undefined)),
  getLevels:vi.fn(()=>of(levels)),createLevel:vi.fn(()=>of(levels[0])),updateLevel:vi.fn(()=>of(levels[0])),deleteLevel:vi.fn(()=>of(undefined)),
  getSoSchedules:vi.fn(()=>of([schedule])),createSoSchedule:vi.fn(()=>of(schedule)),deleteSoSchedule:vi.fn(()=>of(undefined)),setScheduleSubjects:vi.fn(()=>of(schedule)),getScheduleSubjects:vi.fn(()=>of([111])),patchScheduleStatus:vi.fn(()=>of(schedule)),
  getPeriodTarget:vi.fn(()=>of({period_id:1,target_pct:80})),updatePeriodTarget:vi.fn(()=>of({period_id:1,target_pct:85})),getMyAssessments:vi.fn(()=>of([assessment])),createRubric:vi.fn(()=>of(rubric)),getRubrics:vi.fn(()=>of([rubric])),
  getIndicatorsChart:vi.fn(()=>of({period_id:1,items:[{performance_id:'P1',rank:1,level_id:'L1',total:1},{performance_id:'P1',rank:4,level_id:'L4',total:2}]})),
  getDashboardProgram:vi.fn(()=>of({period_id:1,expected:3,done:1,items:[{program_id:'IT1',expected:3,done:1}]})),
  getDashboardSo:vi.fn(()=>of({period_id:1,expected:3,items:[{so_id:'SO1',expected:3,done:1}]})),
  getDashboardTeacher:vi.fn(()=>of({period_id:1,expected:3,done:1,items:[{evaluator_user_id:7,expected:3,done:1}]})),
  getPublicIndicators:vi.fn(()=>of({min_group_size:5,average_pct:75,total_assessments:10,items:[{so_id:'SO1',description:'Outcome',assessments:10,students:6,suppressed:false,levels:[{rank:4,label:'Supera',pct:75}]}]})),
 };
 const integrations={list:vi.fn(()=>of([connection])),create:vi.fn(()=>of(connection)),update:vi.fn(()=>of(connection)),probe:vi.fn(()=>of({reachable:true})),sync:vi.fn(()=>of(run)),runs:vi.fn(()=>of([run])),records:vi.fn(()=>of([{external_id:'A1',payload:{id:'A1'},updated_at:run.started_at}]))};
 const actualExcel=new BulkExcelService();
 const excel={downloadTemplate:vi.fn(async()=>{}),readRows:vi.fn(async()=>[] as Record<string,unknown>[]),value:actualExcel.value.bind(actualExcel),boolValue:actualExcel.boolValue.bind(actualExcel)};
 const messages={add:vi.fn()};const confirm={confirm:vi.fn((data:{accept?:()=>void})=>data.accept?.())};
 const auth={user:vi.fn(()=>teacher),role:vi.fn(()=>teacher.role),logout:vi.fn(),isDemo:vi.fn(()=>false),getAuthMode:vi.fn(()=>of({demo_enabled:false,demo_roles:[]})),login:vi.fn(()=>of(teacher)),demoLogin:vi.fn(()=>of(teacher)),hasPermission:vi.fn(()=>true)};
 return {api,assesment,integrations,excel,messages,confirm,auth,fb:new FormBuilder()};
}
