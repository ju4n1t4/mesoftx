import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { BackendStatus, BackendStatusService } from '../../../../../shared/services/backend-status.service';
import { CardComponent } from '../../../../../shared/ui/atoms/card/card.component';
import { MetricCardComponent } from '../../../../../shared/ui/molecules/metric-card/metric-card.component';

interface ProgramProgress {
  name: string;
  value: number;
  accent: string;
}

@Component({
  selector: 'mx-dashboard',
  standalone: true,
  imports: [CommonModule, MetricCardComponent, CardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly backendStatusService = inject(BackendStatusService);
  readonly statuses = signal<BackendStatus[]>([]);

  readonly programs: ProgramProgress[] = [
    { name: 'Ingenieria de Sistemas', value: 88, accent: '#16a34a' },
    { name: 'Ingenieria Industrial', value: 74, accent: '#ea580c' },
    { name: 'Ingenieria Biomedica', value: 81, accent: '#16a34a' },
    { name: 'Ingenieria Mecatronica', value: 66, accent: '#dc2626' },
    { name: 'Ingenieria en Energia', value: 79, accent: '#ea580c' }
  ];

  readonly averageProgress = computed(() => Math.round(this.programs.reduce((total, item) => total + item.value, 0) / this.programs.length));

  ngOnInit(): void {
    this.backendStatusService.userMs().subscribe((status) => this.pushStatus(status));
    this.backendStatusService.assesmentMs().subscribe((status) => this.pushStatus(status));
  }

  private pushStatus(status: BackendStatus): void {
    this.statuses.update((items) => [...items.filter((item) => item.name !== status.name), status]);
  }
}
