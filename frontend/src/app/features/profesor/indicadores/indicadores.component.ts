import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';

import { SelectModule } from 'primeng/select';
import { ChartModule } from 'primeng/chart';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { UserApiService } from '../../../core/services/user-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { MyAssessment, Rubric } from '../../../core/models/abet.models';
import { IndicatorsChartComponent } from '../../../shared/indicators-chart/indicators-chart.component';

interface SoIndicatorRow {
  so_id: string;
  description: string;
  expected: number;
  done: number;
  pct: number;
}

const TARGET = 80;

@Component({
  selector: 'app-indicadores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule, ChartModule, MessageModule, ToastModule, IndicatorsChartComponent],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Mis indicadores ABET</h1>
        <p>Cumplimiento promedio por Student Outcome frente a la meta institucional (80%).</p>
      </div>

      <div class="toolbar">
        <p-select appendTo="body" [options]="periodOptions()" [formControl]="periodCtrl"
                  optionLabel="label" optionValue="value" placeholder="Selecciona un periodo"></p-select>
      </div>

      <p-message *ngIf="periodCtrl.value == null && periodOptions().length > 0" severity="info" styleClass="block">
        <span>Selecciona un periodo para ver la gráfica.</span>
      </p-message>

      <p-message *ngIf="!loading() && periodOptions().length === 0" severity="info" styleClass="block">
        <span>Aún no tienes Student Outcomes abiertos para valorar.</span>
      </p-message>

      <div class="type-cards" *ngIf="periodCtrl.value != null">
        <button type="button" class="type-card" [class.selected]="viewMode() === 'so'" (click)="setMode('so')">
          <span>Por Student Outcome</span>
          <small>Cumplimiento frente a la meta institucional.</small>
        </button>
        <button type="button" class="type-card" [class.selected]="viewMode() === 'id'" (click)="setMode('id')">
          <span>Por Identificador de Desempeño</span>
          <small>Distribución por nivel en cada ID.</small>
        </button>
      </div>

      <div class="so-dashboard" *ngIf="periodCtrl.value != null && viewMode() === 'so'">
        <section class="radar-card">
          <h2>Cumplimiento por Outcome</h2>
          <div class="empty" *ngIf="soRows().length === 0">Sin valoraciones registradas para los SO de este periodo.</div>
          <p-chart *ngIf="soRows().length > 0" type="radar" [data]="soRadarData()" [options]="radarOptions" height="260px"></p-chart>
          <div class="legend" *ngIf="soRows().length > 0">
            <span><i class="dot mine"></i> Mi desempeño</span>
            <span><i class="line-target"></i> Meta ABET 80%</span>
          </div>
        </section>

        <section class="detail-card">
          <h2>Detalle por Outcome</h2>
          <div class="empty" *ngIf="soRows().length === 0">No hay datos para mostrar.</div>
          <div class="outcome-row" *ngFor="let row of soRows()">
            <div class="outcome-main">
              <span class="so-badge">{{ row.so_id }}</span>
              <div class="outcome-copy">
                <strong>{{ row.description }}</strong>
                <small>{{ row.done }} de {{ row.expected }} valoraciones esperadas</small>
              </div>
            </div>
            <div class="progress-wrap">
              <div class="target-marker" [style.left.%]="target"></div>
              <div class="progress-track">
                <div class="progress-fill" [class.ok]="row.pct >= target" [style.width.%]="barWidth(row.pct)"></div>
              </div>
            </div>
            <div class="outcome-state">
              <strong>{{ row.pct }}%</strong>
              <span [class.ok]="row.pct >= target">{{ row.pct >= target ? 'Cumple' : 'En riesgo' }}</span>
            </div>
          </div>
        </section>
      </div>

      <div class="card" *ngIf="periodCtrl.value != null && viewMode() === 'id'">
        <app-indicators-chart [periodId]="periodCtrl.value"></app-indicators-chart>
      </div>
    </div>
  `,
  styles: [`
    .toolbar { margin-bottom: 16px; }
    .block { display: block; margin-bottom: 16px; }
    .card, .radar-card, .detail-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; }
    .type-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .type-card { text-align: left; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 16px; cursor: pointer; font-family: inherit; }
    .type-card:hover { border-color: var(--primary); }
    .type-card.selected { border-color: var(--primary); background: rgba(16,185,129,.08); box-shadow: inset 0 0 0 1px var(--primary); }
    .type-card span { display: block; font-weight: 800; color: var(--text); margin-bottom: 4px; }
    .type-card small { color: var(--text-muted); line-height: 1.4; }
    .so-dashboard { display: grid; grid-template-columns: minmax(260px, 360px) minmax(0, 1fr); gap: 16px; }
    .radar-card h2, .detail-card h2 { margin: 0 0 16px; font-size: 14px; font-weight: 800; color: var(--text); }
    .empty { color: var(--text-muted); font-size: 14px; padding: 16px 0; }
    .legend { display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; margin-top: 12px; font-size: 12px; color: var(--text-muted); }
    .dot.mine { width: 8px; height: 8px; border-radius: 999px; display: inline-block; margin-right: 6px; background: #7C3AED; }
    .line-target { width: 14px; border-top: 2px dashed #F59E0B; display: inline-block; margin-right: 6px; vertical-align: middle; }
    .outcome-row { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(240px, 1.8fr) 70px; gap: 16px; align-items: center; padding: 10px 0; }
    .outcome-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .so-badge { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; font-size: 10px; font-weight: 800; flex-shrink: 0; }
    .outcome-copy { min-width: 0; }
    .outcome-copy strong { display: block; color: var(--text); font-size: 13px; overflow-wrap: anywhere; }
    .outcome-copy small { display: block; color: var(--text-muted); margin-top: 2px; font-size: 11px; }
    .progress-wrap { position: relative; height: 20px; display: flex; align-items: center; }
    .progress-track { width: 100%; height: 7px; border-radius: 999px; background: #E5E7EB; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 999px; background: #EF4444; }
    .progress-fill.ok { background: #10B981; }
    .target-marker { position: absolute; top: 1px; bottom: 1px; width: 2px; background: #F59E0B; z-index: 1; }
    .outcome-state { text-align: right; }
    .outcome-state strong { display: block; color: #EF4444; font-size: 12px; }
    .outcome-state span { display: inline-flex; margin-top: 4px; padding: 3px 8px; border-radius: 4px; background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 800; }
    .outcome-state span.ok { background: #DCFCE7; color: #16A34A; }
    .outcome-state:has(span.ok) strong { color: #16A34A; }
    @media (max-width: 900px) {
      .so-dashboard, .outcome-row { grid-template-columns: 1fr; }
      .outcome-state { text-align: left; }
    }
  `],
})
export class IndicadoresComponent implements OnInit {
  loading = signal(true);
  periodCtrl = new FormControl<number | null>(null);
  viewMode = signal<'so' | 'id'>('so');
  private periods = signal<{ label: string; value: number }[]>([]);
  private assessments = signal<MyAssessment[]>([]);
  soRows = signal<SoIndicatorRow[]>([]);
  soRadarData = signal<Record<string, unknown>>({});
  periodOptions = () => this.periods();
  target = TARGET;

  radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { display: false, stepSize: 20 },
        pointLabels: { color: '#64748B', font: { size: 11, weight: '700' } },
        grid: { color: '#E5E7EB' },
        angleLines: { color: '#E5E7EB' },
      },
    },
  };

  constructor(
    private assesment: AssesmentApiService,
    private userApi: UserApiService,
    private auth: AuthService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.periodCtrl.valueChanges.subscribe(periodId => {
      if (periodId != null) this.loadSoChart(periodId);
      else { this.soRows.set([]); this.soRadarData.set({}); }
    });

    this.assesment.getMyAssessments().subscribe({
      next: assessments => {
        this.assessments.set(assessments ?? []);
        const unique = [...new Set((assessments ?? []).map(a => a.period_id))]
          .sort((a, b) => b - a)
          .map(id => ({ label: `Periodo ${id}`, value: id }));
        this.periods.set(unique);
        this.periodCtrl.setValue(unique[0]?.value ?? null);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.showError(e, 'No se pudieron cargar los periodos disponibles');
      },
    });
  }

  setMode(mode: 'so' | 'id'): void {
    this.viewMode.set(mode);
  }

  barWidth(pct: number): number {
    return Math.max(0, Math.min(100, pct));
  }

  private loadSoChart(periodId: number): void {
    const periodAssessments = this.assessments().filter(a => a.period_id === periodId);
    if (periodAssessments.length === 0) {
      this.soRows.set([]);
      this.soRadarData.set({});
      return;
    }

    forkJoin({
      rubrics: this.assesment.getRubrics({ period_id: periodId }),
      expected: forkJoin(periodAssessments.map(a => forkJoin({
        assessment: of(a),
        students: this.userApi.getSubjectStudents(a.nrc),
        performances: this.assesment.getPerformances(a.so_id),
      }))),
    }).subscribe({
      next: ({ rubrics, expected }) => this.buildSoRows(periodAssessments, rubrics ?? [], expected),
      error: e => this.showError(e, 'No se pudo cargar la gráfica por SO'),
    });
  }

  private buildSoRows(
    periodAssessments: MyAssessment[],
    rubrics: Rubric[],
    expectedRows: { assessment: MyAssessment; students: unknown[]; performances: unknown[] }[],
  ): void {
    const currentUserId = this.auth.user()?.id;
    const bySo = new Map<string, SoIndicatorRow>();

    for (const item of expectedRows) {
      const a = item.assessment;
      const current = bySo.get(a.so_id) ?? {
        so_id: a.so_id,
        description: a.description,
        expected: 0,
        done: 0,
        pct: 0,
      };
      current.expected += (item.students?.length ?? 0) * (item.performances?.length ?? 0);
      current.done += rubrics.filter(r =>
        r.schedule_id === a.schedule_id &&
        r.subjects_id === a.nrc &&
        (currentUserId == null || r.evaluator_user_id === currentUserId)
      ).length;
      bySo.set(a.so_id, current);
    }

    const rows = [...bySo.values()]
      .map(row => ({ ...row, pct: row.expected === 0 ? 0 : Math.round((row.done / row.expected) * 100) }))
      .sort((a, b) => a.so_id.localeCompare(b.so_id));

    this.soRows.set(rows);
    this.soRadarData.set({
      labels: rows.map(r => r.so_id),
      datasets: [
        {
          label: 'Mi desempeño',
          data: rows.map(r => r.pct),
          borderColor: '#7C3AED',
          backgroundColor: 'rgba(124, 58, 237, .12)',
          pointBackgroundColor: '#7C3AED',
          pointBorderColor: '#7C3AED',
          pointRadius: 3,
          borderWidth: 2,
        },
        {
          label: 'Meta ABET 80%',
          data: rows.map(() => TARGET),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, .08)',
          pointRadius: 0,
          borderDash: [4, 4],
          borderWidth: 1.5,
        },
      ],
    });
  }

  private showError(e: HttpErrorResponse, fallback: string): void {
    this.messageService.add({
      severity: 'error',
      summary: `Error ${e.status}`,
      detail: typeof e.error?.detail === 'string' ? e.error.detail : fallback,
    });
  }
}
