import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { Period, Rubric } from '../../../core/models/abet.models';
import { IndicatorsChartComponent } from '../../../shared/indicators-chart/indicators-chart.component';

@Component({
  selector: 'app-auditor-indicadores',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, SelectModule, ToastModule, ProgressSpinnerModule, MessageModule,
    IndicatorsChartComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Indicadores y resultados de rÃºbricas</h1>
        <p>Consulta de solo lectura del desempeÃ±o por indicador y de las valoraciones registradas.</p>
      </div>

      <div class="toolbar">
        <p-select appendTo="body" [options]="periodOptions()" [formControl]="periodCtrl"
                  optionLabel="label" optionValue="value" placeholder="Selecciona un periodo"></p-select>
      </div>

      <p-message *ngIf="periodCtrl.value == null" severity="info" styleClass="block">
        <span>Selecciona un periodo para ver la grÃ¡fica de indicadores y las rÃºbricas.</span>
      </p-message>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <ng-container *ngIf="periodCtrl.value != null && !loading()">
        <app-indicators-chart [periodId]="periodCtrl.value"></app-indicators-chart>

        <!-- Resultados de rÃºbricas -->
        <div class="card">
          <h2>Resultados de rÃºbricas</h2>
          <p-table [value]="rubrics()" styleClass="p-datatable-sm" [paginator]="true" [rows]="10">
            <ng-template pTemplate="header"><tr><th>Estudiante</th><th>NRC</th><th>Indicador</th><th>Nivel</th><th>Evaluador</th></tr></ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.student_id }}</td><td>{{ r.subjects_id }}</td>
                <td>{{ r.performance_id }}</td><td>{{ r.level_id }}</td><td>{{ r.evaluator_user_id }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="empty-cell">Sin rÃºbricas en este periodo.</td></tr></ng-template>
          </p-table>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .toolbar { margin-bottom: 16px; }
    .block { display: block; margin-bottom: 16px; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; margin-bottom: 16px; }
    .card h2 { font-size: 15px; font-weight: 700; margin-bottom: 12px; }
    .empty { color: var(--text-muted); font-size: 14px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
  `],
})
export class AuditorIndicadoresComponent implements OnInit {
  loading = signal(false);
  private periods = signal<Period[]>([]);
  rubrics = signal<Rubric[]>([]);

  periodCtrl = new FormControl<number | null>(null);
  periodOptions = () => this.periods().map(p => ({ label: p.code, value: p.id }));

  constructor(
    private userApi: UserApiService,
    private assesment: AssesmentApiService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.userApi.getPeriods().subscribe({
      next: p => {
        const periods = p ?? [];
        this.periods.set(periods);
        this.periodCtrl.setValue(periods[0]?.id ?? null);
      },
      error: e => this.showError(e),
    });
    this.periodCtrl.valueChanges.subscribe(v => this.load(v));
  }

  private load(periodId: number | null): void {
    if (periodId == null) { this.rubrics.set([]); return; }
    this.loading.set(true);
    // La grÃ¡fica la carga el componente compartido; aquÃ­ solo las rÃºbricas.
    this.assesment.getRubrics({ period_id: periodId }).subscribe({
      next: r => { this.rubrics.set(r ?? []); this.loading.set(false); },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  private showError(err: HttpErrorResponse): void {
    let detail: string;
    if (err.status === 503) detail = 'Servicio no disponible, intenta en unos segundos';
    else if (err.status === 404) detail = 'No encontrado';
    else detail = typeof err.error?.detail === 'string' ? err.error.detail : 'OcurriÃ³ un error inesperado';
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }
}
