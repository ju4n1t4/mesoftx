import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserApiService } from '../../../core/services/user-api.service';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-coord-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Panel de coordinación</h1>
        <p>Estado general del proceso de valoración ABET en el período activo.</p>
      </div>

      <!-- Aviso discreto: no bloquea la estructura -->
      <div class="notice" *ngIf="error()">
        <i class="pi pi-info-circle"></i>
        <span>{{ error() }} Se muestran los indicadores en cero hasta que haya datos disponibles.</span>
      </div>

      <ng-container>
        <!-- KPIs con conteos reales -->
        <div class="kpi-grid">
          <div class="kpi-card" style="border-top-color: var(--primary)">
            <div class="kpi-label">Programas (carreras)</div>
            <div class="kpi-value">{{ careersCount() }}</div>
            <div class="kpi-sub">Registradas en el sistema</div>
          </div>
          <div class="kpi-card" style="border-top-color: var(--accent)">
            <div class="kpi-label">Docentes</div>
            <div class="kpi-value">{{ teachersCount() }}</div>
            <div class="kpi-sub">Usuarios con rol docente</div>
          </div>
          <div class="kpi-card" style="border-top-color: var(--badge-open)">
            <div class="kpi-label">Student Outcomes</div>
            <div class="kpi-value">{{ sosCount() }}</div>
            <div class="kpi-sub">Configurados</div>
          </div>
          <div class="kpi-card" style="border-top-color: var(--n2-color)">
            <div class="kpi-label">Valoraciones</div>
            <div class="kpi-value">{{ resultsCount() }}</div>
            <div class="kpi-sub">Resultados registrados</div>
          </div>
        </div>

        <div class="dash-row">
          <div class="progress-card">
            <h2>Avance de valoración por programa</h2>
            <div class="empty-inline" *ngIf="careers().length === 0">
              Sin programas registrados en la base de datos.
            </div>
            <div class="prog-list" *ngIf="careers().length > 0">
              <div class="prog-row" *ngFor="let c of careers()">
                <span class="prog-name">{{ c.name }}</span>
                <span class="prog-note">Sin valoraciones registradas</span>
              </div>
            </div>
          </div>

          <div class="actions-card">
            <h3>Acciones rápidas</h3>
            <a routerLink="/coordinador/student-outcomes" class="action-btn">
              <span class="ab-icon orange"><i class="pi pi-sliders-h"></i></span>
              <span class="ab-text">
                <span class="ab-title">Parametrizar rúbrica</span>
                <span class="ab-sub">Editar Student Outcomes</span>
              </span>
            </a>
            <a routerLink="/coordinador/docentes" class="action-btn">
              <span class="ab-icon purple"><i class="pi pi-users"></i></span>
              <span class="ab-text">
                <span class="ab-title">Gestionar docentes</span>
                <span class="ab-sub">Roles y asignaciones</span>
              </span>
            </a>
            <a routerLink="/coordinador/valoraciones" class="action-btn">
              <span class="ab-icon green"><i class="pi pi-check-square"></i></span>
              <span class="ab-text">
                <span class="ab-title">Revisar valoraciones</span>
                <span class="ab-sub">Estado por curso</span>
              </span>
            </a>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .notice {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25);
      border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px;
      font-size: 13px; color: var(--text-muted);
    }
    .notice i { color: var(--primary); flex-shrink: 0; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
    .kpi-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; border-top: 3px solid var(--border); }
    .kpi-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
    .kpi-value { font-size: 32px; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 6px; }
    .kpi-sub { font-size: 12px; color: var(--text-muted); }

    .dash-row { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
    .progress-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; }
    .progress-card h2 { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 18px; }
    .empty-inline { font-size: 13px; color: var(--text-muted); padding: 12px 0; }
    .prog-list { display: flex; flex-direction: column; gap: 12px; }
    .prog-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .prog-row:last-child { border-bottom: none; }
    .prog-name { font-size: 13px; color: var(--text); }
    .prog-note { font-size: 12px; color: var(--text-muted); }

    .actions-card { background: var(--sidebar-bg); border-radius: var(--radius-md); padding: 20px; }
    .actions-card h3 { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 16px; }
    .action-btn { display: flex; align-items: center; gap: 12px; background: #26253A; border-radius: var(--radius-md); padding: 14px; margin-bottom: 10px; text-decoration: none; transition: background 0.15s; }
    .action-btn:last-child { margin-bottom: 0; }
    .action-btn:hover { background: #2E2D40; }
    .ab-icon { width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .ab-icon.orange { background: var(--primary); color: #1A1A2E; }
    .ab-icon.purple { background: var(--accent); color: #fff; }
    .ab-icon.green { background: var(--badge-open); color: #fff; }
    .ab-text { display: flex; flex-direction: column; }
    .ab-title { font-size: 13px; font-weight: 700; color: #fff; }
    .ab-sub { font-size: 11px; color: #9AA0AD; margin-top: 1px; }
  `]
})
export class CoordDashboardComponent implements OnInit {
  loading = signal(true);
  error   = signal('');

  careers      = signal<any[]>([]);
  careersCount  = signal(0);
  teachersCount = signal(0);
  sosCount      = signal(0);
  resultsCount  = signal(0);

  constructor(private userApi: UserApiService, private assesment: AssesmentApiService) {}

  ngOnInit() {
    forkJoin({
      careers: this.userApi.getCareers(),
      users:   this.userApi.getUsers(),
      roles:   this.userApi.getRoles(),
      sos:     this.assesment.getStudentOutcomes(),
      results: this.assesment.getAssesmentResults(),
    }).subscribe({
      next: (r) => {
        this.careers.set(r.careers);
        this.careersCount.set(r.careers.length);
        const docenteRole = r.roles.find(x => x.name?.toLowerCase() === 'docente');
        this.teachersCount.set(docenteRole ? r.users.filter(u => u.role_id === docenteRole.id).length : 0);
        this.sosCount.set(r.sos.length);
        this.resultsCount.set(r.results.length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con el servicio. Verifica que los microservicios estén activos.');
        this.loading.set(false);
      },
    });
  }
}
