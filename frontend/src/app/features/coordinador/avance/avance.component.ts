import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TabViewModule } from 'primeng/tabview';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';

import { UserApiService } from '../../../core/services/user-api.service';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import {
  Period, Program, User, StudentOutcome,
  DashboardProgramResponse, DashboardSoResponse, DashboardTeacherResponse,
} from '../../../core/models/abet.models';

/** Fila normalizada de avance para pintar tabla y gráfica en cualquier pestaña. */
interface ProgressRow { key: string; name: string; expected: number; done: number; pct: number; }

/** Datos de una pestaña ya resueltos (nombres cruzados en memoria). */
interface TabData {
  totalExpected: number;
  totalDone: number;
  totalPct: number;
  rows: ProgressRow[];
}

@Component({
  selector: 'app-avance',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TabViewModule, SelectModule, TableModule, ProgressBarModule, ChartModule,
    ProgressSpinnerModule, MessageModule, ButtonModule,
  ],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Avance de la valoración</h1>
        <p>Porcentaje de valoraciones registradas frente a las esperadas, por programa, por profesor y por student outcome.</p>
      </div>

      <div class="toolbar">
        <p-select [options]="periodOptions()" [formControl]="periodCtrl"
                  optionLabel="label" optionValue="value" placeholder="Selecciona un periodo" appendTo="body"></p-select>
      </div>

      <p-message *ngIf="periodCtrl.value == null" severity="info" styleClass="block">
        <span>Selecciona un periodo para ver el avance.</span>
      </p-message>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <!-- Error 503 (u otro): mensaje + reintentar -->
      <div class="error-box" *ngIf="!loading() && errorMsg()">
        <p-message severity="error" styleClass="block"><span>{{ errorMsg() }}</span></p-message>
        <button pButton type="button" label="Reintentar" icon="pi pi-refresh" (click)="reload()"></button>
      </div>

      <p-tabView *ngIf="periodCtrl.value != null && !loading() && !errorMsg()">
        <p-tabPanel header="Por programa">
          <ng-container *ngTemplateOutlet="tabTpl; context: { $implicit: program(), unit: 'programa' }"></ng-container>
        </p-tabPanel>
        <p-tabPanel header="Por profesor">
          <ng-container *ngTemplateOutlet="tabTpl; context: { $implicit: teacher(), unit: 'profesor' }"></ng-container>
        </p-tabPanel>
        <p-tabPanel header="Por student outcome">
          <ng-container *ngTemplateOutlet="tabTpl; context: { $implicit: so(), unit: 'student outcome' }"></ng-container>
        </p-tabPanel>
      </p-tabView>
    </div>

    <!-- Plantilla común de pestaña -->
    <ng-template #tabTpl let-data let-unit="unit">
      <ng-container *ngIf="data as d">
        <!-- expected == 0 => sin programación -->
        <div class="empty" *ngIf="d.totalExpected === 0">
          Sin programación en este periodo. Programa un student outcome y ábrelo para empezar a medir el avance.
        </div>

        <ng-container *ngIf="d.totalExpected > 0">
          <div class="total-card">
            <div class="total-head">Avance del periodo</div>
            <div class="total-pct" [class]="pctClass(d.totalPct)">{{ d.totalPct }} %</div>
            <div class="total-sub">{{ d.totalDone }} de {{ d.totalExpected }} valoraciones</div>
            <p-progressBar [value]="d.totalPct" [showValue]="false" [styleClass]="'pb-' + pctClass(d.totalPct)"></p-progressBar>
          </div>

          <div class="chart-wrap">
            <p-chart type="bar" [data]="chartFor(d)" [options]="barOptions" height="320px"></p-chart>
          </div>

          <p-table [value]="d.rows" styleClass="p-datatable-sm" [paginator]="d.rows.length > 12" [rows]="12">
            <ng-template pTemplate="header">
              <tr><th>{{ unit | titlecase }}</th><th class="num">Esperadas</th><th class="num">Hechas</th><th class="num">Faltan</th><th style="width:220px">Avance</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.name }}</td>
                <td class="num">{{ r.expected }}</td>
                <td class="num">{{ r.done }}</td>
                <td class="num">{{ r.expected - r.done }}</td>
                <td><p-progressBar [value]="r.pct" [styleClass]="'pb-' + pctClass(r.pct)"></p-progressBar></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="empty-cell">Sin filas para este periodo.</td></tr>
            </ng-template>
          </p-table>
        </ng-container>
      </ng-container>
    </ng-template>
  `,
  styles: [`
    .toolbar { margin-bottom: 16px; }
    .block { display: block; margin-bottom: 12px; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .error-box { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
    .empty { color: var(--text-muted); font-size: 14px; padding: 24px 0; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
    .num { text-align: right; }
    .total-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; margin-bottom: 16px; text-align: center; }
    .total-head { font-size: 13px; color: var(--text-muted); }
    .total-pct { font-size: 40px; font-weight: 800; margin: 4px 0; }
    .total-pct.low { color: #DC2626; } .total-pct.mid { color: #EA580C; } .total-pct.high { color: #16A34A; }
    .total-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
    .chart-wrap { margin-bottom: 18px; }
  `],
})
export class AvanceComponent implements OnInit {
  private periods = signal<Period[]>([]);
  loading = signal(false);
  errorMsg = signal<string | null>(null);

  program = signal<TabData | null>(null);
  teacher = signal<TabData | null>(null);
  so = signal<TabData | null>(null);

  // Catálogos de nombres, cargados una vez por recarga (no una llamada por fila).
  private programNames = new Map<string, string>();
  private userNames = new Map<number, string>();
  private soNames = new Map<string, string>();

  periodCtrl = new FormControl<number | null>(null);
  periodOptions = () => this.periods().map(p => ({ label: p.code, value: p.id }));

  barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, max: 100, ticks: { callback: (v: number) => v + '%' } } },
  };

  constructor(private userApi: UserApiService, private assesment: AssesmentApiService) {}

  ngOnInit(): void {
    this.userApi.getPeriods().subscribe({
      next: p => this.periods.set(p ?? []),
      error: e => this.setError(e),
    });
    this.periodCtrl.valueChanges.subscribe(() => this.reload());
  }

  pctClass(pct: number): 'low' | 'mid' | 'high' {
    return pct < 40 ? 'low' : pct < 80 ? 'mid' : 'high';
  }

  reload(): void {
    const periodId = this.periodCtrl.value;
    if (periodId == null) return;
    this.errorMsg.set(null);
    this.loading.set(true);
    // Nombres (una carga) + los 3 dashboards, todo en paralelo.
    forkJoin({
      programs: this.userApi.getPrograms(),
      users: this.userApi.getUsers(),
      sos: this.assesment.getStudentOutcomes(),
      dProgram: this.assesment.getDashboardProgram(periodId),
      dTeacher: this.assesment.getDashboardTeacher(periodId),
      dSo: this.assesment.getDashboardSo(periodId),
    }).subscribe({
      next: res => {
        this.programNames = new Map((res.programs as Program[]).map(p => [p.id, p.name]));
        this.userNames = new Map((res.users as User[]).map(u => [u.id, u.name]));
        this.soNames = new Map((res.sos as StudentOutcome[]).map(s => [s.id, s.description]));
        this.program.set(this.buildProgram(res.dProgram));
        this.teacher.set(this.buildTeacher(res.dTeacher));
        this.so.set(this.buildSo(res.dSo));
        this.loading.set(false);
      },
      error: e => this.setError(e),
    });
  }

  private setError(err: HttpErrorResponse): void {
    this.loading.set(false);
    this.errorMsg.set(err.status === 503
      ? 'Servicio de usuarios no disponible, intenta en unos segundos.'
      : (typeof err.error?.detail === 'string' ? err.error.detail : 'No se pudo cargar el avance.'));
  }

  private pct(done: number, expected: number): number {
    return expected === 0 ? 0 : Math.round((done / expected) * 100);
  }

  /** Ordena de menor a mayor avance: lo que peor va, arriba. */
  private toTab(rows: ProgressRow[], totalExpected: number, totalDone: number): TabData {
    rows.sort((a, b) => a.pct - b.pct);
    return { totalExpected, totalDone, totalPct: this.pct(totalDone, totalExpected), rows };
  }

  private buildProgram(d: DashboardProgramResponse): TabData {
    const rows = d.items.map(i => ({
      key: i.program_id,
      name: this.programNames.get(i.program_id) ?? i.program_id,
      expected: i.expected, done: i.done, pct: this.pct(i.done, i.expected),
    }));
    return this.toTab(rows, d.expected, d.done);
  }

  private buildTeacher(d: DashboardTeacherResponse): TabData {
    const rows = d.items.map(i => ({
      key: String(i.evaluator_user_id),
      name: this.userNames.get(i.evaluator_user_id) ?? `Usuario ${i.evaluator_user_id}`,
      expected: i.expected, done: i.done, pct: this.pct(i.done, i.expected),
    }));
    return this.toTab(rows, d.expected, d.done);
  }

  private buildSo(d: DashboardSoResponse): TabData {
    const rows = d.items.map(i => ({
      key: i.so_id,
      name: this.soNames.get(i.so_id) ? `${i.so_id} · ${this.soNames.get(i.so_id)}` : i.so_id,
      expected: i.expected, done: i.done, pct: this.pct(i.done, i.expected),
    }));
    const totalDone = d.items.reduce((acc, i) => acc + i.done, 0);
    return this.toTab(rows, d.expected, totalDone);
  }

  chartFor(d: TabData): Record<string, unknown> {
    return {
      labels: d.rows.map(r => r.name),
      datasets: [{
        label: 'Avance %',
        data: d.rows.map(r => r.pct),
        backgroundColor: d.rows.map(r => r.pct < 40 ? '#DC2626' : r.pct < 80 ? '#EA580C' : '#16A34A'),
      }],
    };
  }
}
