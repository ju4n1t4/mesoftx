import { describe,it,expect,vi } from 'vitest';
import { BulkExcelService } from './bulk-excel.service';
const fixtures=vi.hoisted(()=>({read:vi.fn(),write:vi.fn(),save:vi.fn()}));
vi.mock('read-excel-file/browser',()=>({readSheet:fixtures.read}));
vi.mock('write-excel-file/browser',()=>({default:(...args:unknown[])=>{fixtures.write(...args);return {toFile:fixtures.save};}}));

describe('Bulk workbook boundary',()=>{
 it('exports template headers and normalizes workbook cells before validation',async()=>{
  const service=new BulkExcelService();await service.downloadTemplate('fixture',['id','name']);expect(fixtures.save).toHaveBeenCalledWith('fixture.xlsx');
  fixtures.read.mockResolvedValueOnce([[' id ','name','date','blank'],[1,'Teacher',new Date('2026-10-25T00:00:00Z'),null]]);
  const rows=await service.readRows(new File(['fixture'],'fixture.xlsx'));expect(rows).toEqual([{id:'1',name:'Teacher',date:'2026-10-25',blank:''}]);expect(service.value({name:' Teacher '},'name')).toBe('Teacher');expect(service.boolValue({active:'Sí'},'active')).toBe(true);expect(service.boolValue({active:''},'active',false)).toBe(false);
 });
 it('rejects oversized files and too many rows and accepts empty worksheets',async()=>{
  const service=new BulkExcelService();await expect(service.readRows({size:6*1024*1024} as File)).rejects.toThrow('5 MB');fixtures.read.mockResolvedValueOnce([['id'],...Array(5001).fill(['1'])]);await expect(service.readRows(new File(['fixture'],'fixture.xlsx'))).rejects.toThrow('5000');fixtures.read.mockResolvedValueOnce([['id']]);expect(await service.readRows(new File(['fixture'],'fixture.xlsx'))).toEqual([]);
 });
});
