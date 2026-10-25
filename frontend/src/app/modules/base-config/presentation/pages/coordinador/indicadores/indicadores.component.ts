import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { Period } from '../../../../domain/models/abet.models';
import { IndicatorsChartComponent } from '../../../components/indicators-chart/indicators-chart.component';

/**
 * Pantalla 3 (F2) — Gráfica de indicadores del coordinador. Reutiliza el
 * componente compartido de gráfica; solo aporta el selector de periodo.
 */
@Component({
  selector: 'app-coord-indicadores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule, MessageModule, ToastModule, IndicatorsChartComponent],
  providers: [MessageService],
  templateUrl: './indicadores.component.html',
  styleUrl: './indicadores.component.scss',
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
