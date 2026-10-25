import { describe,it,expect } from 'vitest';
import { FacultadesComponent } from '../pages/admin/facultades/facultades.component';
import { PeriodosComponent } from '../pages/admin/periodos/periodos.component';
import { ProgramasComponent } from '../pages/coordinador/programas/programas.component';
import { fixtures,college,program,period,failed,fileEvent } from '../../../../../testing/fixtures';

const cases=[
 {name:'college',Class:FacultadesComponent,record:college,create:'createCollege',update:'updateCollege',remove:'deleteCollege',get:'getColleges',form:{id:'IT2',name:'New college',active:true},rows:[{id:'IT2',name:'New college'},{id:'IT1',name:'Existing'},{id:'',name:'Invalid'}]},
 {name:'program',Class:ProgramasComponent,record:program,create:'createProgram',update:'updateProgram',remove:'deleteProgram',get:'getPrograms',form:{id:'IT2',name:'New program',college_id:'IT1',active:true},rows:[{id:'IT2',name:'New program',college_id:'IT1'},{id:'IT1',name:'Existing',college_id:'IT1'},{id:'IT3',name:'Invalid',college_id:'ZZZ'}]},
 {name:'period',Class:PeriodosComponent,record:period,create:'createPeriod',update:'updatePeriod',remove:'deletePeriod',get:'getPeriods',form:{code:'202660'},rows:[{code:'202660'},{code:'202610'},{code:'wrong'}]},
];
describe('Catalog create/update/activation/import workflows',()=>{
 for(const test of cases){
  const build=()=>{const f=fixtures();const page=new (test.Class as any)(f.fb,f.api,f.excel,f.messages,f.confirm);return {...f,page};};
  it(`${test.name}: validates, creates, edits and removes using the same contracts`,()=>{
   const {page,api,messages}=build();page.ngOnInit();page.openCreate();page.save();expect(page.showErr(test.name==='period'?'code':'name')).toBe(true);
   page.form.patchValue(test.form);page.save();expect((api as any)[test.create]).toHaveBeenCalled();expect(page.saving()).toBe(false);
   page.openEdit(test.record);page.save();expect((api as any)[test.update]).toHaveBeenCalled();
   if(test.name==='period'){page.activatePeriod({...period,active:false});page.activatePeriod(period);expect(page.periodYear('202610')).toBe('2026');expect(page.periodTerm('202610')).toBe('10');}
   else page.toggleActive(test.record);
   page.confirmDelete(test.record);expect((api as any)[test.remove]).toHaveBeenCalled();expect(messages.add).toHaveBeenCalled();
   if(test.name==='program')expect(page.collegeOptions()[0].value).toBe('IT1');
  });
  it(`${test.name}: reports write, delete, activation and reload failures`,()=>{
   const {page,api,messages}=build();page.ngOnInit();page.openEdit(test.record);
   (api as any)[test.update].mockReturnValue(failed(503));page.save();expect(page.saving()).toBe(false);
   if(test.name==='period')page.activatePeriod({...period,active:false});else page.toggleActive(test.record);
   (api as any)[test.remove].mockReturnValue(failed(404));page.confirmDelete(test.record);
   (api as any)[test.get].mockReturnValue(failed(401));page.ngOnInit();expect(page.loading()).toBe(false);expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
  });
  it(`${test.name}: imports valid rows, skips duplicates and reports invalid rows and provider failures`,async()=>{
   const {page,api,excel}=build();page.ngOnInit();page.downloadTemplate();expect(excel.downloadTemplate).toHaveBeenCalled();
   excel.readRows.mockResolvedValueOnce(test.rows);await page.onBulkFile(fileEvent());expect(page.bulkSummary.success).toHaveLength(1);expect(page.bulkSummary.skipped).toHaveLength(1);expect(page.bulkSummary.errors).toHaveLength(1);
   (api as any)[test.create].mockReturnValue(failed(503));excel.readRows.mockResolvedValueOnce([test.rows[0]]);await page.onBulkFile(fileEvent());expect(page.bulkSummary.errors).toHaveLength(1);
   excel.readRows.mockRejectedValueOnce(new Error('Corrupt workbook'));await page.onBulkFile(fileEvent());expect(page.bulkSummary.errors[0].row).toBe(0);
  });
 }
});
