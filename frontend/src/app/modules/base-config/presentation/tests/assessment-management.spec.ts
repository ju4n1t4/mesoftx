import { describe,it,expect } from 'vitest';
import { of } from 'rxjs';
import { fixtures,failed,fileEvent,outcome,performance,levels,schedule } from '../../../../../testing/fixtures';
import { StudentOutcomesComponent } from '../pages/coordinador/student-outcomes/student-outcomes.component';
import { ProgramacionComponent } from '../pages/coordinador/programacion/programacion.component';

function rubricPage(){const f=fixtures();return {...f,page:new StudentOutcomesComponent(f.assesment as never,f.api as never,f.excel as never,f.fb,f.messages as never,f.confirm as never)};}
function importRows(so='SO2',id='ID2') {return ['Insatisfactorio','En desarrollo','Bueno','Supera las expectativas'].map(Level=>({SO:so,SODescription:'Fixture outcome',College:'IT1',ID:id,IDDescription:'Fixture indicator',Level,LevelDescription:'Descriptor '+Level}));}

describe('Outcome and rubric management',()=>{
 it('loads the outcome tree and creates/updates outcomes, indicators and all four levels',()=>{
  const f=rubricPage();const p=f.page;p.ngOnInit();expect(p.tree()[0].performances[0].levels).toHaveLength(4);expect(p.activeColleges()).toHaveLength(1);expect(p.levelName(4)).toContain('Supera');expect(p.perfCode(performance)).toBe('1');
  p.openSoForm();expect(p.editingSo()).toBe(false);p.saveSo();p.soForm.patchValue({description:'New outcome'});p.saveSo();expect(f.assesment.createStudentOutcome).toHaveBeenCalled();p.openSoForm(outcome);p.saveSo();expect(p.editingSo()).toBe(true);expect(f.assesment.updateStudentOutcome).toHaveBeenCalled();
  p.openPerfForm(outcome);expect(p.perfDialogHeader()).toContain('Nuevo');p.savePerf();p.perfForm.patchValue({id:'ID2',description:'New indicator'});p.levelControls.forEach(control=>control.patchValue({description:'Fixture descriptor'}));p.savePerf();expect(f.assesment.createLevel).toHaveBeenCalledTimes(4);
  p.openPerfForm(outcome,performance);expect(p.perfDialogHeader()).toContain('Editar');p.savePerf();expect(f.assesment.updatePerformance).toHaveBeenCalled();
  p.openCompleteLevels(outcome,{perf:performance,levels:[]});p.saveCompleteLevels();p.completeControls.forEach(control=>control.patchValue({description:'Missing descriptor'}));p.saveCompleteLevels();expect(p.completeDialog).toBe(false);
  const node=p.tree()[0];p.confirmDeletePerf(node,node.performances[0]);p.confirmDeleteSo(node);expect(f.assesment.deletePerformance).toHaveBeenCalled();expect(f.assesment.deleteStudentOutcome).toHaveBeenCalled();
 });
 it('shows load/write/delete failures without leaving a busy state or losing current data',()=>{
  const f=rubricPage();const p=f.page;p.ngOnInit();const node=p.tree()[0];
  p.openSoForm(outcome);f.assesment.updateStudentOutcome.mockReturnValueOnce(failed());p.saveSo();expect(p.saving()).toBe(false);
  p.openPerfForm(outcome,performance);f.assesment.updatePerformance.mockReturnValueOnce(failed());p.savePerf();
  p.openPerfForm(outcome);p.perfForm.patchValue({description:'New indicator'});p.levelControls.forEach(control=>control.patchValue({description:'Descriptor'}));f.assesment.createLevel.mockReturnValueOnce(failed());p.savePerf();expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'warn'}));
  f.assesment.createPerformance.mockReturnValueOnce(failed());p.savePerf();
  p.openCompleteLevels(outcome,{perf:performance,levels:[]});p.completeControls.forEach(control=>control.patchValue({description:'Descriptor'}));f.assesment.createLevel.mockReturnValueOnce(failed());p.saveCompleteLevels();
  f.assesment.deleteStudentOutcome.mockReturnValueOnce(failed(409));p.confirmDeleteSo(node);f.assesment.deletePerformance.mockReturnValueOnce(failed(409));p.confirmDeletePerf(node,node.performances[0]);
  f.assesment.getLevels.mockReturnValueOnce(failed());p.ngOnInit();f.assesment.getPerformances.mockReturnValueOnce(failed());p.ngOnInit();f.assesment.getStudentOutcomes.mockReturnValueOnce(failed());f.api.getColleges.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);
 });
 it('imports complete rubric groups, rejects malformed groups and skips existing indicators',async()=>{
  const f=rubricPage();const p=f.page;p.ngOnInit();p.downloadImportTemplate();expect(f.excel.downloadTemplate).toHaveBeenCalled();
  f.excel.readRows.mockResolvedValueOnce([...importRows(),...importRows('SO1','1'),{SO:'',ID:''},...importRows('SO3','ID3').slice(0,1)]);
  f.assesment.createStudentOutcome.mockReturnValueOnce(of({...outcome,id:'SO2'}));await p.onImportFile(fileEvent());expect(p.importSummary.success.length).toBeGreaterThanOrEqual(2);expect(p.importSummary.skipped).toHaveLength(1);expect(p.importSummary.errors).toHaveLength(2);
  f.excel.readRows.mockResolvedValueOnce(importRows());f.assesment.createStudentOutcome.mockReturnValueOnce(failed());await p.onImportFile(fileEvent());expect(p.importSummary.errors).toHaveLength(1);
  f.excel.readRows.mockResolvedValueOnce(importRows('SO1','NEW'));f.assesment.createPerformance.mockReturnValueOnce(failed());await p.onImportFile(fileEvent());expect(p.importSummary.errors).toHaveLength(1);
  f.excel.readRows.mockRejectedValueOnce(new Error('Corrupt workbook'));await p.onImportFile(fileEvent());expect(p.importSummary.errors[0].detail).toContain('Corrupt');
 });
});

describe('Scheduling and period target management',()=>{
 function setup(){const f=fixtures();return {...f,page:new ProgramacionComponent(f.api as never,f.assesment as never,f.messages as never,f.confirm as never)};}
 it('loads period metadata, programs outcomes, assigns NRCs and applies status transitions',()=>{
  const f=setup();const p=f.page;p.ngOnInit();p.periodCtrl.setValue(1);expect(p.periodOptions()[0].value).toBe(1);expect(p.soOptions()[0].value).toBe('SO1');expect(p.soDescription('SO1')).toBe(outcome.description);expect(p.rows()[0].nrcCount).toBe(1);expect(p.targetCtrl.value).toBe(80);
  for(const status of ['PLANIFICADO','EN_CURSO','CERRADO'] as const){expect(p.statusLabel(status)).toBeTruthy();expect(p.statusSeverity(status)).toBeTruthy();}
  p.targetCtrl.setValue(85);p.saveTarget();expect(p.targetConfigured()).toBe(true);p.openProgram();p.soCtrl.setValue('SO1');p.createSchedule();expect(f.assesment.createSoSchedule).toHaveBeenCalledWith({so_id:'SO1',period_id:1});
  const row=p.rows()[0];p.openNrc(row);expect(p.periodSubjectOptions()[0].value).toBe(111);p.saveNrc();expect(f.assesment.setScheduleSubjects).toHaveBeenCalled();p.changeStatus(row,'EN_CURSO');p.confirmClose(row);p.confirmReopen(row);p.confirmDelete(row);expect(f.assesment.deleteSoSchedule).toHaveBeenCalled();
 });
 it('restores the saved target on conflict and reports each failed mutation/load',()=>{
  const f=setup();const p=f.page;p.ngOnInit();p.periodCtrl.setValue(1);const row=p.rows()[0];
  f.assesment.updatePeriodTarget.mockReturnValueOnce(failed(409));p.targetCtrl.setValue(90);p.saveTarget();expect(p.targetCtrl.value).toBe(80);expect(p.targetSaving()).toBe(false);
  p.openProgram();p.soCtrl.setValue('SO1');f.assesment.createSoSchedule.mockReturnValueOnce(failed());p.createSchedule();
  f.api.getSubjects.mockReturnValueOnce(failed());p.openNrc(row);p.openNrc(row);f.assesment.setScheduleSubjects.mockReturnValueOnce(failed());p.saveNrc();
  f.assesment.patchScheduleStatus.mockReturnValueOnce(failed(409));p.changeStatus(row,'CERRADO');f.assesment.deleteSoSchedule.mockReturnValueOnce(failed());p.confirmDelete(row);
  f.assesment.getScheduleSubjects.mockReturnValueOnce(failed());f.assesment.getPeriodTarget.mockReturnValueOnce(failed(404));p.periodCtrl.setValue(1);expect(p.rows()[0].nrcCount).toBe(0);expect(p.targetConfigured()).toBe(false);
  f.assesment.getSoSchedules.mockReturnValueOnce(failed());p.periodCtrl.setValue(1);p.periodCtrl.setValue(null);expect(p.rows()).toHaveLength(0);
  f.api.getPeriods.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
 });
});
