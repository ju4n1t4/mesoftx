import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { ButtonAtom } from '../../atoms/button/button.directive';
export interface OutcomeChartRow { so_id: string; description: string; done: number; expected: number; pct: number; }
export interface DetailChartRow { indicator: string; rank: number; name: string; total: number; pct: number; }
@Component({ selector: 'mx-indicators-chart', standalone: true,
  imports: [CommonModule, ChartModule, TableModule, ProgressSpinnerModule, MessageModule, ButtonModule, ButtonAtom],
  templateUrl: './indicators-chart-view.component.html', styleUrl: './indicators-chart-view.component.scss' })
export class IndicatorsChartViewComponent {
  @Input() loading = false;
  @Input() errorMsg: string|null = null;
  @Input() selectedSoId: string|null = null;
  @Input() selectedSoDescription = '';
  @Input() lockedDetail = false;
  @Input() soRows: OutcomeChartRow[] = [];
  @Input() detailRows: DetailChartRow[] = [];
  @Input() soRadarData: Record<string, unknown> = {};
  @Input() detailChartData: Record<string, unknown> = {};
  @Input() radarOptions: Record<string, unknown> = {};
  @Input() barOptions: Record<string, unknown> = {};
  @Input() target = 80;
  @Output() detailRequested = new EventEmitter<string>();
  @Output() backRequested = new EventEmitter<void>();
  barWidth(pct: number): number { return Math.max(0, Math.min(100, pct)); }
  colorForRank(rank: number): string { return ['#999', '#DC2626', '#EA580C', '#84CC16', '#16A34A'][rank] ?? '#999'; }
}
