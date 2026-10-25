import { IndicatorsChartViewComponent } from '../../../../../shared/ui/organisms/indicators-chart/indicators-chart-view.component';
import { ButtonAtom } from '../../../../../shared/ui/atoms/button/button.directive';
import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';

import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';

import { AssesmentGateway as AssesmentApiService } from '../../../application/ports/assesment-api.service.port';
import { ChartLevelItem, Performance, SoProgressItem, StudentOutcome } from '../../../domain/models/abet.models';

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
  imports: [IndicatorsChartViewComponent],
  templateUrl: './indicators-chart.component.html',
  styleUrl: './indicators-chart.component.scss',
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
