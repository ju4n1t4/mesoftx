import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';

import { SelectModule } from 'primeng/select';
import { ChartModule } from 'primeng/chart';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { AuthService } from '../../../../../auth/application/services/auth.service';
import { MyAssessment, Rubric } from '../../../../domain/models/abet.models';
import { IndicatorsChartComponent } from '../../../components/indicators-chart/indicators-chart.component';

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
  imports: [ButtonAtom, CommonModule, ReactiveFormsModule, SelectModule, ChartModule, MessageModule, ToastModule, ButtonModule, IndicatorsChartComponent],
  providers: [MessageService],
  templateUrl: './indicadores.component.html',
  styleUrl: './indicadores.component.scss',
})
export class IndicadoresComponent implements OnInit {
  loading = signal(true);
  periodCtrl = new FormControl<number | null>(null);
  selectedDetailSo = signal<string | null>(null);
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
      this.selectedDetailSo.set(null);
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
