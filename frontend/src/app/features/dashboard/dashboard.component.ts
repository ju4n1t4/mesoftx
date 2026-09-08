import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { BackendStatus, BackendStatusService } from '../../core/services/backend-status.service';
import { ButtonComponent } from '../../shared/atoms/button/button.component';
import { CardComponent } from '../../shared/atoms/card/card.component';
import { MetricCardComponent } from '../../shared/molecules/metric-card/metric-card.component';

interface ProgramProgress {
  name: string;
  value: number;
  accent: string;
}

@Component({
  selector: 'mx-dashboard',
  standalone: true,
  imports: [CommonModule, MetricCardComponent, CardComponent, ButtonComponent],
  template: `
    <section class="dashboard">
      <div class="heading">
        <div>
          <h1>Panel de coordinacion</h1>
          <p>Estado general del proceso de valoracion ABET en el periodo 202610.</p>
        </div>
      </div>

      <section class="metrics">
        <mx-metric-card label="Programas acreditables" value="5" hint="En proceso ABET" accent="var(--mx-primary)" />
        <mx-metric-card label="Docentes activos" value="48" hint="Registrando valoraciones" accent="var(--mx-secondary)" />
        <mx-metric-card label="Valoraciones cerradas" value="76%" hint="+12% esta semana" accent="var(--mx-success)" />
        <mx-metric-card label="Cursos sin iniciar" value="9" hint="Requieren seguimiento" accent="var(--mx-danger)" />
      </section>

      <section class="content-grid">
        <mx-card>
          <div class="card-head">
            <h2>Avance de valoracion por programa</h2>
            <span>{{ averageProgress() }}%</span>
          </div>
          <div class="progress-list">
            <div *ngFor="let program of programs" class="progress-row">
              <span>{{ program.name }}</span>
              <div class="track">
                <div [style.width.%]="program.value" [style.background]="program.accent"></div>
              </div>
              <strong>{{ program.value }}%</strong>
            </div>
          </div>
        </mx-card>

        <mx-card>
          <h2>Acciones rapidas</h2>
          <div class="actions">
            <button type="button">
              <i class="pi pi-sliders-h"></i>
              <span>Parametrizar rubrica</span>
              <small>Editar Student Outcomes</small>
            </button>
            <button type="button">
              <i class="pi pi-users"></i>
              <span>Gestionar docentes</span>
              <small>Roles y asignaciones</small>
            </button>
            <button type="button">
              <i class="pi pi-check-square"></i>
              <span>Revisar valoraciones</span>
              <small>Estado por curso</small>
            </button>
          </div>
        </mx-card>
      </section>

      <section class="service-grid">
        <article *ngFor="let status of statuses()" [class.offline]="status.status === 'sin-conexion'">
          <i class="pi" [ngClass]="status.status === 'operativo' ? 'pi-check-circle' : 'pi-exclamation-triangle'"></i>
          <div>
            <span>{{ status.name }}</span>
            <strong>{{ status.status }}</strong>
          </div>
        </article>
      </section>
    </section>
  `,
  styles: [`
    .dashboard {
      padding: 28px;
    }
    .heading {
      align-items: flex-start;
      display: flex;
      justify-content: space-between;
      margin-bottom: 22px;
    }
    h1 {
      font-size: 26px;
      line-height: 1;
      margin: 0 0 8px;
    }
    p {
      color: var(--mx-muted);
      font-size: 13px;
      margin: 0;
    }
    .metrics {
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 22px;
    }
    .content-grid {
      display: grid;
      gap: 18px;
      grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    }
    .card-head {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    h2 {
      font-size: 16px;
      margin: 0;
    }
    .card-head span {
      color: var(--mx-success);
      font-size: 13px;
      font-weight: 800;
    }
    .progress-list {
      display: grid;
      gap: 18px;
    }
    .progress-row {
      align-items: center;
      display: grid;
      gap: 14px;
      grid-template-columns: 190px minmax(120px, 1fr) 46px;
    }
    .progress-row span,
    .progress-row strong {
      font-size: 13px;
      font-weight: 800;
    }
    .track {
      background: #eef0f3;
      border-radius: 999px;
      height: 8px;
      overflow: hidden;
    }
    .track div {
      border-radius: inherit;
      height: 100%;
    }
    .actions {
      display: grid;
      gap: 12px;
      margin-top: 18px;
    }
    .actions button {
      align-items: center;
      background: #23202d;
      border: 1px solid rgba(255, 255, 255, .06);
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      display: grid;
      gap: 2px 12px;
      grid-template-columns: 36px 1fr;
      min-height: 62px;
      padding: 10px;
      text-align: left;
    }
    .actions i {
      align-items: center;
      background: var(--mx-primary);
      border-radius: 8px;
      display: inline-flex;
      grid-row: span 2;
      height: 36px;
      justify-content: center;
      width: 36px;
    }
    .actions button:nth-child(2) i {
      background: var(--mx-secondary);
    }
    .actions button:nth-child(3) i {
      background: var(--mx-success);
    }
    .actions span {
      font-size: 13px;
      font-weight: 800;
    }
    .actions small {
      color: #aaa6b8;
      font-size: 11px;
      font-weight: 700;
    }
    .service-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 220px));
      margin-top: 18px;
    }
    .service-grid article {
      align-items: center;
      background: #fff;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      color: var(--mx-success);
      display: flex;
      gap: 12px;
      padding: 12px;
    }
    .service-grid article.offline {
      border-color: #fecdd3;
      color: var(--mx-danger);
    }
    .service-grid span {
      color: var(--mx-muted);
      display: block;
      font-size: 11px;
      font-weight: 800;
    }
    .service-grid strong {
      display: block;
      font-size: 13px;
      margin-top: 2px;
      text-transform: capitalize;
    }
    @media (max-width: 1120px) {
      .metrics,
      .content-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 720px) {
      .dashboard {
        padding: 18px;
      }
      .metrics,
      .content-grid,
      .service-grid {
        grid-template-columns: 1fr;
      }
      .progress-row {
        grid-template-columns: 1fr;
      }
    }
  `]
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
