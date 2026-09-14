import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';

import { AssesmentApiService } from '../../core/services/assesment-api.service';
import { ChartLevelItem } from '../../core/models/abet.models';

/** Nivel fijo por rank: nombre y color del apilado. El orden de apilado sale
 *  SIEMPRE de rank (1 → 4), nunca del orden en que llegan los items. */
const RANK_META: { rank: number; name: string; color: string }[] = [
  { rank: 1, name: 'Insatisfactorio',         color: '#DC2626' }, // rojo
  { rank: 2, name: 'En desarrollo',           color: '#EA580C' }, // ámbar
  { rank: 3, name: 'Bueno',                   color: '#84CC16' }, // verde claro
  { rank: 4, name: 'Supera las expectativas', color: '#16A34A' }, // verde oscuro
];

interface TableRow { performance_id: string; rank: number; name: string; total: number; pct: number; }

/**
 * Gráfica de indicadores compartida (coordinador y auditor). Barras apiladas:
 * una barra por indicador, 4 niveles apilados por rank. Debajo, tabla con
 * indicador · nivel · total · % del indicador.
 */
@Component({
  selector: 'app-indicators-chart',
  standalone: true,
  imports: [CommonModule, ChartModule, TableModule, ProgressSpinnerModule, MessageModule],
  template: `
    <div class="loading-wrap" *ngIf="loading()">
      <p-progressSpinner strokeWidth="4" [style]="{ width: '36px', height: '36px' }"></p-progressSpinner>
    </div>

    <p-message *ngIf="!loading() && errorMsg()" severity="error" styleClass="block">
      <span>{{ errorMsg() }}</span>
    </p-message>

    <ng-container *ngIf="!loading() && !errorMsg()">
      <div class="empty" *ngIf="rows().length === 0">
        Sin valoraciones registradas en este periodo.
      </div>

      <ng-container *ngIf="rows().length > 0">
        <div class="chart-wrap">
          <p-chart type="bar" [data]="chartData()" [options]="chartOptions" height="320px"></p-chart>
        </div>

        <p-table [value]="rows()" styleClass="p-datatable-sm" [paginator]="rows().length > 12" [rows]="12">
          <ng-template pTemplate="header">
            <tr><th>Indicador</th><th>Nivel</th><th class="num">Total</th><th class="num">% del indicador</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr>
              <td>{{ r.performance_id }}</td>
              <td><span class="dot" [style.background]="colorForRank(r.rank)"></span>{{ r.rank }} · {{ r.name }}</td>
              <td class="num">{{ r.total }}</td>
              <td class="num">{{ r.pct }} %</td>
            </tr>
          </ng-template>
        </p-table>
      </ng-container>
    </ng-container>
  `,
  styles: [`
    .loading-wrap { display: flex; justify-content: center; padding: 40px; }
    .block { display: block; margin-bottom: 12px; }
    .empty { color: var(--text-muted); font-size: 14px; padding: 16px 0; }
    .chart-wrap { margin-bottom: 18px; }
    .num { text-align: right; }
    .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 6px; vertical-align: middle; }
  `],
})
export class IndicatorsChartComponent implements OnChanges {
  @Input() periodId: number | null = null;

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  rows = signal<TableRow[]>([]);
  chartData = signal<Record<string, unknown>>({});

  chartOptions = {
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
  }

  colorForRank(rank: number): string {
    return RANK_META.find(m => m.rank === rank)?.color ?? '#999';
  }

  private load(): void {
    const periodId = this.periodId;
    this.errorMsg.set(null);
    if (periodId == null) { this.rows.set([]); this.chartData.set({}); return; }
    this.loading.set(true);
    this.assesment.getIndicatorsChart(periodId).subscribe({
      next: res => {
        const items = res.items ?? [];
        this.buildChart(items);
        this.buildTable(items);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.rows.set([]); this.chartData.set({});
        this.errorMsg.set(e.status === 503
          ? 'Servicio no disponible, intenta en unos segundos'
          : (typeof e.error?.detail === 'string' ? e.error.detail : 'No se pudo cargar la gráfica de indicadores'));
        this.loading.set(false);
      },
    });
  }

  /** Pivot a barras apiladas: labels = indicadores; un dataset por rank (1→4). */
  private buildChart(items: ChartLevelItem[]): void {
    const performanceIds = [...new Set(items.map(i => i.performance_id))].sort();
    const datasets = RANK_META.map(meta => ({
      label: meta.name,
      backgroundColor: meta.color,
      data: performanceIds.map(pid =>
        items.filter(i => i.performance_id === pid && i.rank === meta.rank)
             .reduce((acc, i) => acc + i.total, 0)),
    }));
    this.chartData.set({ labels: performanceIds, datasets });
  }

  /** Tabla ordenada por indicador y rank, con % dentro de cada indicador. */
  private buildTable(items: ChartLevelItem[]): void {
    const totalByPerf = new Map<string, number>();
    items.forEach(i => totalByPerf.set(i.performance_id, (totalByPerf.get(i.performance_id) ?? 0) + i.total));
    const rows: TableRow[] = [...items]
      .sort((a, b) => a.performance_id.localeCompare(b.performance_id) || a.rank - b.rank)
      .map(i => {
        const denom = totalByPerf.get(i.performance_id) ?? 0;
        return {
          performance_id: i.performance_id,
          rank: i.rank,
          name: RANK_META.find(m => m.rank === i.rank)?.name ?? '',
          total: i.total,
          pct: denom === 0 ? 0 : Math.round((i.total / denom) * 100),
        };
      });
    this.rows.set(rows);
  }
}
