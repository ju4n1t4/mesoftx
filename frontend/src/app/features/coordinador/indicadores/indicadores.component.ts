import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { Period } from '../../../core/models/abet.models';
import { IndicatorsChartComponent } from '../../../shared/indicators-chart/indicators-chart.component';

/**
 * Pantalla 3 (F2) — Gráfica de indicadores del coordinador. Reutiliza el
 * componente compartido de gráfica; solo aporta el selector de periodo.
 */
@Component({
  selector: 'app-coord-indicadores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule, MessageModule, ToastModule, IndicatorsChartComponent],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Gráfica de indicadores</h1>
        <p>Distribución de estudiantes por nivel de logro en cada indicador, para el periodo seleccionado.</p>
      </div>

      <div class="toolbar">
        <p-select [options]="periodOptions()" [formControl]="periodCtrl"
                  optionLabel="label" optionValue="value" placeholder="Selecciona un periodo" appendTo="body"></p-select>
      </div>

      <p-message *ngIf="periodCtrl.value == null" severity="info" styleClass="block">
        <span>Selecciona un periodo para ver la gráfica.</span>
      </p-message>

      <app-indicators-chart *ngIf="periodCtrl.value != null" [periodId]="periodCtrl.value"></app-indicators-chart>
    </div>
  `,
  styles: [`
    .toolbar { margin-bottom: 16px; }
    .block { display: block; margin-bottom: 16px; }
  `],
})
export class CoordIndicadoresComponent implements OnInit {
  private periods = signal<Period[]>([]);
  periodCtrl = new FormControl<number | null>(null);
  periodOptions = () => this.periods().map(p => ({ label: p.code, value: p.id }));

  constructor(private userApi: UserApiService, private messageService: MessageService) {}

  ngOnInit(): void {
    this.userApi.getPeriods().subscribe({
      next: p => {
        const periods = p ?? [];
        this.periods.set(periods);
        this.periodCtrl.setValue(periods[0]?.id ?? null);
      },
      error: (e: HttpErrorResponse) => this.messageService.add({
        severity: 'error', summary: `Error ${e.status}`,
        detail: typeof e.error?.detail === 'string' ? e.error.detail : 'No se pudieron cargar los periodos',
      }),
    });
  }
}
