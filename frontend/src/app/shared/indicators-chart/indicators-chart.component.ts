import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';

import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';

import { AssesmentApiService } from '../../core/services/assesment-api.service';
import { ChartLevelItem, Performance, SoProgressItem, StudentOutcome } from '../../core/models/abet.models';

const TARGET = 80;

const RANK_META: { rank: number; name: string; color: string }[] = [
  { rank: 1, name: 'Insatisfactorio', color: '#DC2626' },
  { rank: 2, name: 'En desarrollo', color: '#EA580C' },
  { rank: 3, name: 'Bueno', color: '#84CC16' },
  { rank: 4, name: 'Supera las expectativas', color: '#16A34A' },
];

interface SoRow extends SoProgressItem {
  description: string;
  pct: number;
}

interface TableRow {
  performance_id: string;
  indicator: string;
  rank: number;
  name: string;
  total: number;
  pct: number;
}

@Component({
  selector: 'app-indicators-chart',
  standalone: true,
  imports: [CommonModule, ChartModule, TableModule, ProgressSpinnerModule, MessageModule, ButtonModule],
  template: `
    <div class="loading-wrap" *ngIf="loading()">
      <p-progressSpinner strokeWidth="4" [style]="{ width: '36px', height: '36px' }"></p-progressSpinner>
    </div>

    <p-message *ngIf="!loading() && errorMsg()" severity="error" styleClass="block">
      <span>{{ errorMsg() }}</span>
    </p-message>

    <ng-container *ngIf="!loading() && !errorMsg()">
      <ng-container *ngIf="!selectedSoId(); else detailView">
        <div class="empty" *ngIf="soRows().length === 0">Sin Student Outcomes programados en este periodo.</div>

        <div class="so-dashboard" *ngIf="soRows().length > 0">
          <section class="radar-card">
            <h2>Cumplimiento por Outcome</h2>
            <p-chart type="radar" [data]="soRadarData()" [options]="radarOptions" height="260px"></p-chart>
            <div class="legend">
              <span><i class="dot mine"></i> Desempeño</span>
              <span><i class="line-target"></i> Meta ABET 80%</span>
            </div>
          </section>

          <section class="detail-card">
            <h2>Detalle por Outcome</h2>
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
              <button pButton type="button" label="Ver Detalle" class="p-button-sm p-button-secondary"
                      (click)="showDetail(row.so_id)"></button>
            </div>
          </section>
        </div>
      </ng-container>

      <ng-template #detailView>
        <div class="detail-header">
          <div>
            <h2>Detalle por Identificador de Desempeño</h2>
            <p>{{ selectedSoId() }} · {{ selectedSoDescription() }}</p>
          </div>
          <button pButton type="button" label="Volver" icon="pi pi-arrow-left" class="p-button-text"
                  *ngIf="!lockedDetail()" (click)="backToSo()"></button>
        </div>

        <div class="empty" *ngIf="detailRows().length === 0">
          Sin valoraciones registradas para este Student Outcome.
        </div>

        <ng-container *ngIf="detailRows().length > 0">
          <div class="chart-wrap">
            <p-chart type="bar" [data]="detailChartData()" [options]="barOptions" height="320px"></p-chart>
          </div>

          <p-table [value]="detailRows()" styleClass="p-datatable-sm" [paginator]="detailRows().length > 12" [rows]="12">
            <ng-template pTemplate="header">
              <tr><th>ID</th><th>Nivel</th><th class="num">Total</th><th class="num">% del ID</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.indicator }}</td>
                <td><span class="rank-dot" [style.background]="colorForRank(r.rank)"></span>{{ r.rank }} · {{ r.name }}</td>
                <td class="num">{{ r.total }}</td>
                <td class="num">{{ r.pct }} %</td>
              </tr>
            </ng-template>
          </p-table>
        </ng-container>
      </ng-template>
    </ng-container>
  `,
  styles: [`
    .loading-wrap { display: flex; justify-content: center; padding: 40px; }
    .block { display: block; margin-bottom: 12px; }
    .empty { color: var(--text-muted); font-size: 14px; padding: 16px 0; }
    .so-dashboard { display: grid; grid-template-columns: minmax(260px, 360px) minmax(0, 1fr); gap: 16px; }
    .radar-card, .detail-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; }
    .radar-card h2, .detail-card h2, .detail-header h2 { margin: 0 0 12px; font-size: 14px; font-weight: 800; color: var(--text); }
    .legend { display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; margin-top: 12px; font-size: 12px; color: var(--text-muted); }
    .dot.mine { width: 8px; height: 8px; border-radius: 999px; display: inline-block; margin-right: 6px; background: #7C3AED; }
    .line-target { width: 14px; border-top: 2px dashed #F59E0B; display: inline-block; margin-right: 6px; vertical-align: middle; }
    .outcome-row { display: grid; grid-template-columns: minmax(200px, 1fr) minmax(220px, 1.5fr) 70px auto; gap: 14px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .outcome-row:last-child { border-bottom: 0; }
    .outcome-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .so-badge { min-width: 32px; height: 28px; border-radius: 999px; padding: 0 7px; display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: #fff; font-size: 10px; font-weight: 800; flex-shrink: 0; }
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
    .detail-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
    .detail-header p { margin: 0; color: var(--text-muted); font-size: 13px; }
    .chart-wrap { margin-bottom: 18px; }
    .num { text-align: right; }
    .rank-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 6px; vertical-align: middle; }
    @media (max-width: 900px) {
      .so-dashboard, .outcome-row { grid-template-columns: 1fr; }
      .outcome-state { text-align: left; }
    }
  `],
})
export class IndicatorsChartComponent implements OnChanges {
  @Input() periodId: number | null = null;
  @Input() detailSoId: string | null = null;
  @Input() detailOnly = false;

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  soRows = signal<SoRow[]>([]);
  soRadarData = signal<Record<string, unknown>>({});
  selectedSoId = signal<string | null>(null);
  detailRows = signal<TableRow[]>([]);
  detailChartData = signal<Record<string, unknown>>({});
  target = TARGET;

  private outcomes = signal<StudentOutcome[]>([]);
  private chartItems = signal<ChartLevelItem[]>([]);
  private performancesBySo = signal<Map<string, Performance[]>>(new Map());
  private performanceCode = signal<Map<string, string>>(new Map());

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

  barOptions = {
    indexAxis: 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  constructor(private assesment: AssesmentApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ('periodId' in changes) this.load();
    if ('detailSoId' in changes && this.detailSoId) this.showDetail(this.detailSoId);
  }

  lockedDetail(): boolean {
    return !!this.detailSoId;
  }

  selectedSoDescription(): string {
    const soId = this.selectedSoId();
    return this.outcomes().find(so => so.id === soId)?.description ?? '';
  }

  barWidth(pct: number): number {
    return Math.max(0, Math.min(100, pct));
  }

  colorForRank(rank: number): string {
    return RANK_META.find(m => m.rank === rank)?.color ?? '#999';
  }

  showDetail(soId: string): void {
    this.selectedSoId.set(soId);
    this.buildDetail(soId);
  }

  backToSo(): void {
    this.selectedSoId.set(null);
    this.detailRows.set([]);
    this.detailChartData.set({});
  }

  private load(): void {
    const periodId = this.periodId;
    this.errorMsg.set(null);
    this.backToSo();
    if (periodId == null) { this.soRows.set([]); this.soRadarData.set({}); return; }

    this.loading.set(true);
    forkJoin({
      dashboard: this.detailOnly ? of({ period_id: periodId, expected: 0, items: [] }) : this.assesment.getDashboardSo(periodId),
      outcomes: this.assesment.getStudentOutcomes(),
      schedules: this.assesment.getSoSchedules(periodId),
      chart: this.assesment.getIndicatorsChart(periodId),
    }).subscribe({
      next: ({ dashboard, outcomes, schedules, chart }) => {
        this.outcomes.set(outcomes ?? []);
        this.chartItems.set(chart.items ?? []);
        const soIds = [...new Set((schedules ?? []).map(s => s.so_id))];
        const perfs$ = soIds.length
          ? forkJoin(soIds.map(soId => this.assesment.getPerformances(soId)))
          : of([] as Performance[][]);
        perfs$.subscribe({
          next: perfsBySo => {
            const bySo = new Map<string, Performance[]>();
            const codeById = new Map<string, string>();
            soIds.forEach((soId, index) => {
              const perfs = perfsBySo[index] ?? [];
              bySo.set(soId, perfs);
              perfs.forEach(perf => codeById.set(perf.id, perf.code || perf.id));
            });
            this.performancesBySo.set(bySo);
            this.performanceCode.set(codeById);
            if (!this.detailOnly) this.buildSoRows(dashboard.items ?? []);
            if (this.detailSoId) this.showDetail(this.detailSoId);
            this.loading.set(false);
          },
          error: e => this.fail(e),
        });
      },
      error: e => this.fail(e),
    });
  }

  private buildSoRows(items: SoProgressItem[]): void {
    const description = new Map(this.outcomes().map(so => [so.id, so.description]));
    const rows = [...items]
      .map(item => ({
        ...item,
        description: description.get(item.so_id) ?? item.so_id,
        pct: item.expected === 0 ? 0 : Math.round((item.done / item.expected) * 100),
      }))
      .sort((a, b) => a.so_id.localeCompare(b.so_id));
    this.soRows.set(rows);
    this.soRadarData.set({
      labels: rows.map(row => row.so_id),
      datasets: [
        {
          label: 'Desempeño',
          data: rows.map(row => row.pct),
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

  private buildDetail(soId: string): void {
    const performanceIds = new Set((this.performancesBySo().get(soId) ?? []).map(perf => perf.id));
    const items = this.chartItems().filter(item => performanceIds.has(item.performance_id));
    const labels = [...new Set(items.map(item => item.performance_id))]
      .sort((a, b) => this.indicatorLabel(a).localeCompare(this.indicatorLabel(b)));
    const datasets = RANK_META.map(meta => ({
      label: meta.name,
      backgroundColor: meta.color,
      data: labels.map(pid =>
        items.filter(item => item.performance_id === pid && item.rank === meta.rank)
          .reduce((acc, item) => acc + item.total, 0)),
    }));
    this.detailChartData.set({ labels: labels.map(pid => this.indicatorLabel(pid)), datasets });

    const totalByPerf = new Map<string, number>();
    items.forEach(item => totalByPerf.set(item.performance_id, (totalByPerf.get(item.performance_id) ?? 0) + item.total));
    this.detailRows.set([...items]
      .sort((a, b) => this.indicatorLabel(a.performance_id).localeCompare(this.indicatorLabel(b.performance_id)) || a.rank - b.rank)
      .map(item => {
        const denom = totalByPerf.get(item.performance_id) ?? 0;
        return {
          performance_id: item.performance_id,
          indicator: this.indicatorLabel(item.performance_id),
          rank: item.rank,
          name: RANK_META.find(meta => meta.rank === item.rank)?.name ?? '',
          total: item.total,
          pct: denom === 0 ? 0 : Math.round((item.total / denom) * 100),
        };
      }));
  }

  private indicatorLabel(performanceId: string): string {
    return this.performanceCode().get(performanceId) ?? performanceId;
  }

  private fail(e: HttpErrorResponse): void {
    this.soRows.set([]);
    this.soRadarData.set({});
    this.detailRows.set([]);
    this.detailChartData.set({});
    this.errorMsg.set(e.status === 503
      ? 'Servicio no disponible, intenta en unos segundos'
      : (typeof e.error?.detail === 'string' ? e.error.detail : 'No se pudo cargar la gráfica de indicadores'));
    this.loading.set(false);
  }
}
