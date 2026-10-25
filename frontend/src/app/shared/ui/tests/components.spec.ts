import { describe,it,expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormFieldComponent } from '../molecules/form-field/form-field.component';
import { IntegrationConnectionsComponent } from '../organisms/integration-connections/integration-connections.component';
import { SidebarNavComponent } from '../organisms/sidebar-nav/sidebar-nav.component';
import { IndicatorsChartViewComponent } from '../organisms/indicators-chart/indicators-chart-view.component';
import { BulkResultDialogComponent } from '../organisms/bulk-result-dialog/bulk-result-dialog.component';
import { WorkspaceShellComponent } from '../templates/workspace-shell/workspace-shell.component';
import { connection } from '../../../../testing/fixtures';

describe('Atomic UI inputs, outputs and projected content',()=>{
 it('renders configured connections and emits a selection without using backend services',()=>{
  TestBed.configureTestingModule({imports:[IntegrationConnectionsComponent]});const fixture=TestBed.createComponent(IntegrationConnectionsComponent);fixture.componentInstance.items=[connection];fixture.detectChanges();let selected=0;fixture.componentInstance.selected.subscribe(id=>selected=id);fixture.nativeElement.querySelector('button').click();expect(selected).toBe(1);expect(fixture.nativeElement.textContent).toContain('Habilitada');fixture.componentInstance.busy=true;fixture.detectChanges();expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
 });
 it('renders shared sidebar links and forwards logout as an event',()=>{
  TestBed.configureTestingModule({imports:[SidebarNavComponent],providers:[provideRouter([])]});const fixture=TestBed.createComponent(SidebarNavComponent);fixture.componentInstance.items=[{label:'Dashboard',icon:'pi-home',route:'/admin/dashboard'}];fixture.componentInstance.helpRoute='/admin/soporte';fixture.detectChanges();let logout=false;fixture.componentInstance.logoutRequested.subscribe(()=>logout=true);fixture.nativeElement.querySelector('button').click();expect(logout).toBe(true);expect(fixture.nativeElement.textContent).toContain('Dashboard');
 });
 it('forwards dialog visibility and keeps chart display helpers bounded',()=>{
  const dialog=new BulkResultDialogComponent();let visible=true;dialog.visibleChange.subscribe(value=>visible=value);dialog.setVisible(false);expect(visible).toBe(false);expect(dialog.visible).toBe(false);
  const chart=new IndicatorsChartViewComponent();expect(chart.barWidth(-1)).toBe(0);expect(chart.barWidth(101)).toBe(100);expect(chart.colorForRank(4)).toBe('#16A34A');expect(chart.colorForRank(9)).toBe('#999');
 });
 it('constructs the shared field and workspace template without domain or authentication dependencies',()=>{
  TestBed.configureTestingModule({imports:[FormFieldComponent,WorkspaceShellComponent]});const field=TestBed.createComponent(FormFieldComponent);field.componentInstance.label='Name';field.componentInstance.forId='name';field.detectChanges();expect(field.nativeElement.querySelector('label').htmlFor).toBe('name');const shell=TestBed.createComponent(WorkspaceShellComponent);shell.detectChanges();expect(shell.nativeElement.querySelector('main')).toBeTruthy();
 });
});
