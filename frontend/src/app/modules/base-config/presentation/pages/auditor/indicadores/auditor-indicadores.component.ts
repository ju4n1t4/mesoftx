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

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import { Period, Rubric } from '../../../../domain/models/abet.models';
import { IndicatorsChartComponent } from '../../../components/indicators-chart/indicators-chart.component';

@Component({
  selector: 'app-auditor-indicadores',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, SelectModule, ToastModule, ProgressSpinnerModule, MessageModule,
    IndicatorsChartComponent,
  ],
  providers: [MessageService],
  templateUrl: './auditor-indicadores.component.html',
  styleUrl: './auditor-indicadores.component.scss',
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
