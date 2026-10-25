import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import {
  Period, Program, User, StudentOutcome,
  DashboardProgramResponse, DashboardSoResponse, DashboardTeacherResponse,
} from '../../../../domain/models/abet.models';

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
  imports: [ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TabsModule, SelectModule, TableModule, ProgressBarModule, ChartModule,
    ProgressSpinnerModule, MessageModule, ButtonModule,
  ],
  templateUrl: './avance.component.html',
  styleUrl: './avance.component.scss',
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
