import { describe,it,expect } from 'vitest';
import { SimpleChange } from '@angular/core';
import { fixtures,failed,period,subject,teacher,outcome,performance,levels,rubric } from '../../../../../testing/fixtures';
import { MisCursosComponent } from '../pages/profesor/mis-cursos/mis-cursos.component';
import { ProfesorDashboardComponent } from '../pages/profesor/dashboard/profesor-dashboard.component';
import { CoordDashboardComponent } from '../pages/coordinador/dashboard/coord-dashboard.component';
import { CoordValoracionesComponent } from '../pages/coordinador/valoraciones/coord-valoraciones.component';
import { AuditorIndicadoresComponent } from '../pages/auditor/indicadores/auditor-indicadores.component';
import { CoordIndicadoresComponent } from '../pages/coordinador/indicadores/indicadores.component';
import { PeriodosComponent } from '../pages/coordinador/periodos/periodos.component';
import { ConfiguracionComponent } from '../pages/coordinador/configuracion/configuracion.component';
import { PublicoComponent } from '../pages/publico/publico.component';
import { InicioAcreditacionComponent } from '../pages/profesor/inicio-acreditacion/inicio-acreditacion.component';
import { AvanceComponent } from '../pages/coordinador/avance/avance.component';
import { IndicatorsChartComponent } from '../components/indicators-chart/indicators-chart.component';
import { of } from 'rxjs';

describe('Dashboards and reporting workflows',()=>{
 it('loads professor courses, enrollment counts and graceful count/provider failures',()=>{
  const f=fixtures();const p=new MisCursosComponent(f.api as never,f.messages as never);p.ngOnInit();expect(p.courses()[0].studentCount).toBe(1);expect(p.pending()).toHaveLength(1);
  f.api.getSubjectStudents.mockReturnValueOnce(failed());p.ngOnInit();expect(p.courses()[0].studentCount).toBe(0);
  f.api.getMySubjects.mockReturnValueOnce(failed(404));p.ngOnInit();expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
 });
 it('joins professor, coordinator and public dashboard data and handles failures',()=>{
  const f=fixtures();const teacherPage=new ProfesorDashboardComponent(f.assesment as never,f.api as never);teacherPage.ngOnInit();expect(teacherPage.studentsCount()).toBe(1);expect(teacherPage.courses()[0].code).toBe('SWE101');
  const coordinator=new CoordDashboardComponent(f.api as never,f.assesment as never);coordinator.ngOnInit();expect(coordinator.teachersCount()).toBe(1);expect(coordinator.careersCount()).toBe(1);
  const rubricPage=new CoordValoracionesComponent(f.assesment as never);rubricPage.ngOnInit();expect(rubricPage.sosCount()).toBe(1);
  const publicPage=new PublicoComponent(f.assesment as never);publicPage.ngOnInit();expect(publicPage.outcomes()[0].levels[0].pct).toBe(75);
  f.assesment.getStudentOutcomes.mockReturnValue(failed());teacherPage.ngOnInit();coordinator.ngOnInit();rubricPage.ngOnInit();expect(teacherPage.error()).toBeTruthy();expect(coordinator.error()).toBeTruthy();expect(rubricPage.error()).toBeTruthy();
  f.assesment.getPublicIndicators.mockReturnValue(failed());publicPage.ngOnInit();expect(publicPage.error()).toBeTruthy();
 });
 it('loads period selectors and audit rubrics after selection',()=>{
  const f=fixtures();const coord=new CoordIndicadoresComponent(f.api as never,f.messages as never);coord.ngOnInit();expect(coord.periodOptions()[0].value).toBe(1);
  const auditor=new AuditorIndicadoresComponent(f.api as never,f.assesment as never,f.messages as never);auditor.ngOnInit();auditor.periodCtrl.setValue(1);expect(auditor.rubrics()).toHaveLength(1);expect(auditor.periodOptions()[0].value).toBe(1);
  f.assesment.getRubrics.mockReturnValueOnce(failed());auditor.periodCtrl.setValue(1);expect(auditor.loading()).toBe(false);
  auditor.periodCtrl.setValue(null);expect(auditor.rubrics()).toHaveLength(0);
  f.api.getPeriods.mockReturnValue(failed());coord.ngOnInit();auditor.ngOnInit();expect(f.messages.add).toHaveBeenCalledWith(expect.objectContaining({severity:'error'}));
 });
 it('creates periods and exposes write/load failures in both coordinator entry points',()=>{
  const f=fixtures();const p=new PeriodosComponent(f.api as never);p.ngOnInit();expect(p.periods()[0].year).toBe('2026');p.addPeriod();expect(p.formError()).toBeTruthy();p.newYear='2026';p.newPeriod='60';p.addPeriod();expect(f.api.createPeriod).toHaveBeenCalledWith({code:'202660'});
  f.api.createPeriod.mockReturnValueOnce(failed());p.newYear='2027';p.newPeriod='10';p.addPeriod();expect(p.formError()).toBeTruthy();
  const config=new ConfiguracionComponent(f.api as never);config.ngOnInit();config.addPeriod();config.newPeriodCode='202660';config.addPeriod();expect(config.newPeriodCode).toBe('');
  f.api.createPeriod.mockReturnValueOnce(failed());config.newPeriodCode='202710';config.addPeriod();expect(config.error()).toBeTruthy();config.cancelPeriod();
  f.api.getPeriods.mockReturnValue(failed(401));p.ngOnInit();config.ngOnInit();expect(p.error()).toBeTruthy();expect(config.error()).toBeTruthy();
 });
 it('calculates accreditation achievement by outcome using rubric level ranks',()=>{
  const f=fixtures();const p=new InicioAcreditacionComponent(f.assesment as never);p.ngOnInit();expect(p.studentsEvaluated()).toBe(1);expect(p.globalPct()).toBe(100);expect(p.inMeta()).toBe(1);
  f.assesment.getLevels.mockReturnValueOnce(failed());p.ngOnInit();expect(p.error()).toBeTruthy();
  f.assesment.getRubrics.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);
  f.assesment.getStudentOutcomes.mockReturnValueOnce(failed());p.ngOnInit();expect(p.error()).toBeTruthy();
 });
 it('builds progress tables and charts from period dashboards without duplicate counts',()=>{
  const f=fixtures();const p=new AvanceComponent(f.api as never,f.assesment as never);p.ngOnInit();p.reload();p.periodCtrl.setValue(1);
  expect(p.program()?.totalPct).toBe(33);expect(p.teacher()?.rows[0].name).toBe('Teacher Example');expect(p.so()?.rows[0].name).toContain('SO1');expect(p.periodOptions()[0].value).toBe(1);
  expect(p.chartFor(p.program()!).datasets).toBeTruthy();expect([p.pctClass(10),p.pctClass(60),p.pctClass(90)]).toEqual(['low','mid','high']);expect(p.barOptions.scales.x.ticks.callback(20)).toBe('20%');
  f.assesment.getDashboardSo.mockReturnValueOnce(failed());p.reload();expect(p.errorMsg()).toBeTruthy();
  f.api.getPeriods.mockReturnValueOnce(failed());p.ngOnInit();expect(p.loading()).toBe(false);
 });
 it('joins indicator chart data, drills down and clears stale output after load failures',()=>{
  const f=fixtures();const p=new IndicatorsChartComponent(f.assesment as never);p.periodId=1;p.ngOnChanges({periodId:new SimpleChange(null,1,true)});
  expect(p.soRows()[0].pct).toBe(33);expect(p.soRadarData()['datasets']).toBeTruthy();p.showDetail('SO1');expect(p.selectedSoDescription()).toBe('Outcome One');expect(p.detailRows()).toHaveLength(2);expect(p.detailChartData()['labels']).toEqual(['1']);expect(p.lockedDetail()).toBe(false);
  p.detailSoId='SO1';p.ngOnChanges({detailSoId:new SimpleChange(null,'SO1',false)});expect(p.lockedDetail()).toBe(true);p.backToSo();expect(p.detailRows()).toHaveLength(0);
  f.assesment.getPerformances.mockReturnValueOnce(failed());p.ngOnChanges({periodId:new SimpleChange(null,1,false)});expect(p.errorMsg()).toBeTruthy();
  f.assesment.getIndicatorsChart.mockReturnValueOnce(failed());p.ngOnChanges({periodId:new SimpleChange(null,1,false)});expect(p.loading()).toBe(false);
  p.periodId=null;p.ngOnChanges({periodId:new SimpleChange(1,null,false)});expect(p.soRows()).toHaveLength(0);
 });
});
