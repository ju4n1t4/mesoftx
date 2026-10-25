import { describe,it,expect } from 'vitest';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { fixtures,failed,fileEvent,subject,student,assessment,performance,levels,rubric } from '../../../../../testing/fixtures';
import { EstudiantesComponent } from '../pages/profesor/estudiantes/estudiantes.component';
import { ValorarComponent } from '../pages/profesor/valorar/valorar.component';

const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

describe('Teacher enrollment and rubric workflows',()=>{
 it('checks NRC assignment and enrolls manually or by workbook with duplicate validation',async()=>{
  const f=fixtures();const route={snapshot:{paramMap:convertToParamMap({nrc:'111'})}};const p=new EstudiantesComponent(route as never,f.api as never,f.excel as never,f.messages as never);p.ngOnInit();expect(p.subject()?.nrc).toBe(111);expect(p.enrolled()).toHaveLength(1);p.openCreate();p.saveManual();expect(p.formError()).toBeTruthy();p.studentForm={document_number:'S002',name:'New Student'};p.saveManual();await flush();expect(p.saving()).toBe(false);expect(p.dialogVisible).toBe(false);
  p.studentForm={document_number:'S001',name:'Already Enrolled'};p.saveManual();expect(p.formError()).toContain('matriculado');p.downloadTemplate();
  f.excel.readRows.mockResolvedValueOnce([{document_number:'S002',name:'New Student'},{document_number:'S001',name:'Existing'},{document_number:'S002',name:'Duplicate'},{document_number:'',name:'Invalid'}]);await p.onBulkFile(fileEvent());expect(p.bulkSummary.success).toHaveLength(1);expect(p.bulkSummary.skipped).toHaveLength(2);expect(p.bulkSummary.errors).toHaveLength(1);
  f.excel.readRows.mockRejectedValueOnce(new Error('Workbook'));await p.onBulkFile(fileEvent());expect(p.bulkSummary.errors[0].row).toBe(0);
  f.api.uploadStudents.mockReturnValueOnce(failed());p.openCreate();p.studentForm={document_number:'S002',name:'New Student'};p.saveManual();await flush();expect(p.formError()).toBeTruthy();
  f.api.getSubjectStudents.mockReturnValueOnce(failed());f.api.getMySubjects.mockReturnValueOnce(failed());p.ngOnInit();expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
 });
 function setup(){
  const f=fixtures();f.api.getMySubjects.mockReturnValue(of([subject,{...subject,nrc:112,materia_curso:'SWE102'}]));f.assesment.getMyAssessments.mockReturnValue(of([assessment,{...assessment,nrc:112}]));
  f.api.getSubjectStudents.mockReturnValue(of([student,{...student,id:11,document_number:'S002',name:'New Student'}]));f.assesment.getPerformances.mockReturnValue(of([performance,{...performance,id:'P2',code:'2'}]));
  f.assesment.getLevels.mockImplementation((id?:string)=>of(levels.map(level=>({...level,id:`${id}L${level.rank}`,performance_id:id??'P1'}))));
  return {...f,page:new ValorarComponent(f.api as never,f.assesment as never,f.auth as never,f.messages as never)};
 }
 it('loads assignments, selects a student, preserves rated indicators and saves new choices',()=>{
  const f=setup();const p=f.page;p.ngOnInit();expect(p.nrcOptions()).toHaveLength(2);expect(p.assessmentsForSelectedNrc()).toHaveLength(1);p.pickNrc(112);p.pickNrc(111);p.pickAssessment(assessment);expect(p.students()).toHaveLength(2);p.pickStudent(p.students().find(s=>s.id===10)!);expect(p.indicators()[0].alreadyRated).toBe(true);p.chooseLevel(0,'P1L1');expect(p.levelControl(0).value).toBe('L4');
  p.pickStudent(p.students().find(s=>s.id===11)!);expect(p.student()?.id).toBe(11);expect(p.subjectInfo()?.nrc).toBe(111);expect(p.subjectLabel()).toContain('SWE101');expect(p.subjectProgram()).toBe('IT1');expect(p.periodLabel()).toContain('1');expect(p.professorName()).toBe('Teacher Example');expect(p.levelName(4)).toContain('Supera');expect(p.performanceCode(performance)).toBe('1');p.chooseLevel(0,'P1L4');expect(p.canSave()).toBe(true);p.save();expect(f.assesment.createRubric).toHaveBeenCalledWith(expect.objectContaining({student_id:11,level_id:'P1L4'}));expect(p.student()).toBeNull();expect(p.saving()).toBe(false);p.reset();expect(p.assessment()).toBeNull();
 });
 it('reports partial write failures and refreshes assignments when a period closes mid-save',()=>{
  const f=setup();const p=f.page;p.ngOnInit();p.pickAssessment(assessment);p.pickStudent(p.students().find(s=>s.id===11)!);p.chooseLevel(0,'P1L4');p.chooseLevel(1,'P2L4');f.assesment.createRubric.mockReturnValueOnce(of(rubric));f.assesment.createRubric.mockReturnValueOnce(failed(409,'El periodo fue cerrado'));p.save();expect(p.saving()).toBe(false);expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));expect(f.assesment.getMyAssessments).toHaveBeenCalledTimes(2);
 });
 it('surfaces assignment, student, performance and level service failures',()=>{
  const f=setup();const p=f.page;p.ngOnInit();f.api.getSubjectStudents.mockReturnValueOnce(failed());p.pickAssessment(assessment);p.pickAssessment(assessment);f.assesment.getLevels.mockReturnValueOnce(failed());p.pickStudent({...student,evaluated:false});f.assesment.getPerformances.mockReturnValueOnce(failed());p.pickStudent({...student,evaluated:false});f.assesment.getMyAssessments.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
 });
});
