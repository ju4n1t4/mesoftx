import { describe,it,expect } from 'vitest';
import { of } from 'rxjs';
import { fixtures,failed,fileEvent,teacher,subject } from '../../../../../testing/fixtures';
import { PerfilesComponent } from '../pages/admin/perfiles/perfiles.component';
import { UsuariosComponent } from '../pages/admin/usuarios/usuarios.component';
import { MateriasComponent } from '../pages/coordinador/materias/materias.component';
import { AsignacionMateriasComponent } from '../pages/coordinador/asignacion-materias/asignacion-materias.component';

describe('Profile, user and course management',()=>{
 it('creates/edits profiles, loads current permissions before replacing and deletes unassigned roles',()=>{
  const f=fixtures();const p=new PerfilesComponent(f.fb,f.api as never,f.messages as never,f.confirm as never);p.ngOnInit();p.openCreate();p.saveRole();expect(p.showErr('name')).toBe(true);
  p.roleForm.patchValue({name:'Fixture profile'});p.saveRole();expect(f.api.createRole).toHaveBeenCalled();p.openEdit({id:3,name:'Profesor'});p.saveRole();expect(f.api.updateRole).toHaveBeenCalled();
  p.openPermissions({id:3,name:'Profesor'});expect(p.permTarget()?.id).toBe(3);expect(p.permCtrl.value).toEqual(['RUBRIC_VIEW']);
  for(const [index,group] of p.permissionGroups.entries()){
   expect(p.trackPermissionGroup(index,group)).toBe(group.title);
   for(const [i,action] of group.actions.entries()){
    expect(p.trackPermissionAction(i,action)).toContain(action.label);
    if(p.isActionEnabled(action)){p.togglePermissionAction(action,true);expect(p.isActionSelected(action)).toBe(true);p.togglePermissionAction(action,false);expect(p.isActionSelected(action)).toBe(false);}
    else {p.togglePermissionAction(action,true);expect(p.isActionSelected(action)).toBe(false);}
   }
  }
  p.savePermissions();expect(f.api.setRolePermissions).toHaveBeenCalled();p.confirmDelete({id:3,name:'Profesor'});expect(f.api.deleteRole).toHaveBeenCalled();
 });
 it('keeps permission failures visible and closes busy states on every failed write',()=>{
  const f=fixtures();const p=new PerfilesComponent(f.fb,f.api as never,f.messages as never,f.confirm as never);p.ngOnInit();p.openEdit({id:3,name:'Profesor'});
  f.api.updateRole.mockReturnValueOnce(failed());p.saveRole();expect(p.saving()).toBe(false);
  f.api.getRolePermissions.mockReturnValueOnce(failed());p.openPermissions({id:3,name:'Profesor'});expect(p.loadingPerms()).toBe(false);expect(p.permVisible).toBe(false);
  p.openPermissions({id:3,name:'Profesor'});f.api.setRolePermissions.mockReturnValueOnce(failed());p.savePermissions();expect(p.saving()).toBe(false);
  f.api.deleteRole.mockReturnValueOnce(failed(409));p.confirmDelete({id:3,name:'Profesor'});
  f.api.getRoles.mockReturnValue(failed());p.openEdit({id:3,name:'Profesor'});p.saveRole();p.ngOnInit();expect(p.loading()).toBe(false);expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
 });
 it('validates coordinator accounts, creates, updates and reports write/load errors',()=>{
  const f=fixtures();const p=new UsuariosComponent(f.fb,f.api as never,f.messages as never);p.ngOnInit();expect(p.roleOptions().map(r=>r.label)).toEqual(['Coordinador']);expect(p.roleName(3)).toBe('Profesor');
  p.openCreate();p.save();expect(p.showErr('name')).toBe(true);p.form.patchValue({document_number:'C01',name:'Coordinator',email:'coord@example.org',password:'Fixture-password-2026',role_id:2});p.save();expect(f.api.createUser).toHaveBeenCalled();
  p.openEdit(teacher);p.save();expect(f.api.updateUser).toHaveBeenCalled();f.api.updateUser.mockReturnValueOnce(failed());p.save();expect(p.saving()).toBe(false);f.api.getUsers.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);
 });
 it('filters courses by period and validates create/update/delete and bulk imports',async()=>{
  const f=fixtures();const p=new MateriasComponent(f.fb,f.api as never,f.excel as never,f.messages as never,f.confirm as never);p.ngOnInit();expect(p.filtered()).toHaveLength(1);p.periodFilter.setValue(2);expect(p.filtered()).toHaveLength(0);p.periodFilter.setValue(1);expect(p.periodCode(1)).toBe('202610');expect(p.periodOptions()).toHaveLength(1);expect(p.programOptions()).toHaveLength(1);
  p.openCreate();p.save();expect(p.showErr('name')).toBe(true);p.form.patchValue({...subject,nrc:112});p.save();expect(f.api.createSubject).toHaveBeenCalled();p.openEdit(subject);p.save();expect(f.api.updateSubject).toHaveBeenCalled();p.confirmDelete(subject);expect(f.api.deleteSubject).toHaveBeenCalled();p.downloadTemplate();
  const row={nrc:'112',materia_curso:'SWE102',name:'Testing',period_code:'202610',program_id:'IT1'};
  f.excel.readRows.mockResolvedValueOnce([row,{...row,nrc:'111'},{...row,nrc:'0'}]);await p.onBulkFile(fileEvent());expect(p.bulkSummary.success).toHaveLength(1);expect(p.bulkSummary.skipped).toHaveLength(1);expect(p.bulkSummary.errors).toHaveLength(1);
  f.api.createSubject.mockReturnValueOnce(failed());f.excel.readRows.mockResolvedValueOnce([row]);await p.onBulkFile(fileEvent());expect(p.bulkSummary.errors).toHaveLength(1);
  f.excel.readRows.mockRejectedValueOnce(new Error('Workbook'));await p.onBulkFile(fileEvent());expect(p.bulkSummary.errors[0].row).toBe(0);
 });
 it('reports failures in course catalogs and writes',()=>{
  const f=fixtures();const p=new MateriasComponent(f.fb,f.api as never,f.excel as never,f.messages as never,f.confirm as never);p.ngOnInit();p.openCreate();p.form.patchValue({...subject,nrc:112});f.api.createSubject.mockReturnValueOnce(failed());p.save();p.openEdit(subject);f.api.updateSubject.mockReturnValueOnce(failed());p.save();f.api.deleteSubject.mockReturnValueOnce(failed(404));p.confirmDelete(subject);
  f.api.getPeriods.mockReturnValueOnce(failed());f.api.getPrograms.mockReturnValueOnce(failed());f.api.getSubjects.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
 });
 it('assigns courses to teachers, computes available NRCs and removes assignments',()=>{
  const f=fixtures();f.api.getSubjects.mockReturnValueOnce(of([subject,{...subject,nrc:112}]));const p=new AsignacionMateriasComponent(f.api as never,f.messages as never,f.confirm as never);p.ngOnInit();expect(p.teachers()).toHaveLength(1);p.select(teacher);expect(p.selected()?.id).toBe(7);expect(p.assignments()).toHaveLength(1);expect(p.addableOptions()[0].value).toBe(112);p.toAdd.setValue([112]);p.assign(7);expect(p.busy()).toBe(false);p.confirmRemove(p.assignments()[0]);expect(f.api.deleteTeacherSubject).toHaveBeenCalled();
  f.api.assignTeacherSubject.mockReturnValueOnce(failed());p.toAdd.setValue([112]);p.assign(7);f.api.deleteTeacherSubject.mockReturnValueOnce(failed());p.confirmRemove(p.assignments()[0]);f.api.getTeacherSubjects.mockReturnValueOnce(failed());p.select(teacher);f.api.getUsers.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
 });
});
