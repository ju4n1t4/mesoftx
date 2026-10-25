import { describe,it,expect } from 'vitest';
import { of } from 'rxjs';
import { fixtures,failed,fileEvent,teacher,assessment } from '../../../../../testing/fixtures';
import { ProfesoresComponent } from '../pages/coordinador/profesores/profesores.component';
import { IndicadoresComponent } from '../pages/profesor/indicadores/indicadores.component';

describe('Teacher account management and indicator reports',()=>{
 it('loads teacher profiles, validates forms, creates and edits while retaining identity fields',()=>{
  const f=fixtures();const p=new ProfesoresComponent(f.api as never,f.excel as never);p.ngOnInit();expect(p.filtered()).toHaveLength(1);p.search='teacher';expect(p.filtered()).toHaveLength(1);expect(p.initials(teacher)).toBe('T');expect(p.roleName(3)).toBe('Profesor');expect(p.programName('IT1')).toBe('Software');
  p.openForm();p.save();expect(p.formError()).toBeTruthy();p.form={name:'New Teacher',document_number:'T02',email:'new@example.org',password:'Fixture-password-2026',role_id:3,program_id:'IT1',active:true};p.save();expect(f.api.createUser).toHaveBeenCalled();expect(p.saving()).toBe(false);
  p.openEdit(teacher);p.save();expect(f.api.updateUser).toHaveBeenCalled();p.closeForm();expect(p.showForm()).toBe(false);
  f.api.updateUser.mockReturnValueOnce(failed());p.openEdit(teacher);p.save();expect(p.formError()).toBeTruthy();
  f.api.getUsers.mockReturnValueOnce(failed());f.api.getRoles.mockReturnValueOnce(failed());f.api.getPrograms.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);expect(p.error()).toBeTruthy();
 });
 it('imports teacher accounts using active programs and reports duplicate/invalid/workbook/service failures',async()=>{
  const f=fixtures();const p=new ProfesoresComponent(f.api as never,f.excel as never);p.ngOnInit();p.downloadTemplate();expect(f.excel.downloadTemplate).toHaveBeenCalled();
  const row={document_number:'T02',name:'New Teacher',email:'new@example.org',password:'Fixture-password-2026',program_id:'IT1'};
  f.excel.readRows.mockResolvedValueOnce([row,{...row,document_number:'T01',email:'teacher@example.org'},{...row,document_number:''}]);await p.onBulkFile(fileEvent());expect(p.bulkSummary.success).toHaveLength(1);expect(p.bulkSummary.skipped).toHaveLength(1);expect(p.bulkSummary.errors).toHaveLength(1);
  f.api.createUser.mockReturnValueOnce(failed());f.excel.readRows.mockResolvedValueOnce([{...row,document_number:'T03',email:'another@example.org'}]);await p.onBulkFile(fileEvent());expect(p.bulkSummary.errors).toHaveLength(1);
  f.excel.readRows.mockRejectedValueOnce(new Error('Workbook'));await p.onBulkFile(fileEvent());expect(p.bulkSummary.errors[0].row).toBe(0);
  p.roles.set([]);p.openForm();expect(p.showForm()).toBe(false);await p.onBulkFile(fileEvent());expect(p.bulkSummary.errors[0].detail).toContain('rol Profesor');
 });
 it('computes teacher-owned indicator progress by outcome and period, including the chart models',()=>{
  const f=fixtures();f.assesment.getMyAssessments.mockReturnValue(of([assessment,{...assessment,so_id:'SO2',description:'Second outcome',schedule_id:2},{...assessment,period_id:2}]));
  const p=new IndicadoresComponent(f.assesment as never,f.api as never,f.auth as never,f.messages as never);p.ngOnInit();p.periodCtrl.setValue(1);expect(p.periodOptions()).toHaveLength(2);expect(p.soRows()).toHaveLength(2);expect(p.soRows()[0].done).toBe(1);expect(p.soRadarData()['datasets']).toBeTruthy();expect(p.barWidth(150)).toBe(100);
  f.assesment.getRubrics.mockReturnValueOnce(failed());p.periodCtrl.setValue(1);expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));p.periodCtrl.setValue(null);expect(p.soRows()).toHaveLength(0);
  f.assesment.getMyAssessments.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);
 });
});
