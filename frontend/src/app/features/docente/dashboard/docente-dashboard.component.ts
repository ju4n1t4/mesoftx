import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { UserApiService } from '../../../core/services/user-api.service';
import { StudentOutcome, PerformanceEvaluation } from '../../../core/models/abet.models';

@Component({
  selector: 'app-docente-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Resumen</h1>
        <p>Estado de tus cursos y valoraciones ABET del período académico vigente.</p>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card" style="border-top-color: var(--primary)">
          <div class="kpi-label">Cursos activos</div>
          <div class="kpi-value">{{ courses().length }}</div>
          <div class="kpi-sub">Asignados este período</div>
        </div>
        <div class="kpi-card" style="border-top-color: var(--n2-color)">
          <div class="kpi-label">Valoraciones pendientes</div>
          <div class="kpi-value" style="color: var(--n2-color)">{{ pendingCount() }}</div>
          <div class="kpi-sub">Registradas por ti</div>
        </div>
        <div class="kpi-card" style="border-top-color: var(--accent)">
          <div class="kpi-label">Outcomes disponibles</div>
          <div class="kpi-value" style="color: var(--accent)">{{ outcomes().length }}</div>
          <div class="kpi-sub">Parametrizados en el sistema</div>
        </div>
        <div class="kpi-card" style="border-top-color: var(--badge-open)">
          <div class="kpi-label">Niveles de logro</div>
          <div class="kpi-value" style="color: var(--badge-open)">{{ levels().length }}</div>
          <div class="kpi-sub">Escala de valoración</div>
        </div>
      </div>

      <!-- Mis cursos activos -->
      <div class="section-header">
        <h2>Mis cursos activos</h2>
        <a routerLink="/docente/valoraciones" class="ver-todos">Ver todos →</a>
      </div>

      <div class="state-box" *ngIf="loading()">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Cargando información…</span>
      </div>

      <div class="notice" *ngIf="error()">
        <i class="pi pi-info-circle"></i>
        <span>{{ error() }}</span>
      </div>

      <div class="empty-box" *ngIf="!loading() && courses().length === 0">
        <div class="empty-icon"><i class="pi pi-book"></i></div>
        <div class="empty-title">No tienes cursos asignados</div>
        <div class="empty-desc">Cuando el coordinador te asigne cursos y actividades de valoración aparecerán aquí.</div>
      </div>

      <div class="courses-grid" *ngIf="!loading() && courses().length > 0">
        <div class="course-card" *ngFor="let c of courses()">
          <div class="cc-top">
            <span class="cc-code">{{ c.code }}</span>
          </div>
          <div class="cc-name">{{ c.name }}</div>
          <a [routerLink]="['/docente/valoraciones/registrar']" class="cc-link">
            Registrar valoración →
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px;
    }
    .kpi-card {
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 20px; border-top: 3px solid var(--border);
    }
    .kpi-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
    .kpi-value { font-size: 30px; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 6px; }
    .kpi-sub   { font-size: 12px; color: var(--text-muted); }

    .section-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;
    }
    .section-header h2 { font-size: 16px; font-weight: 700; color: var(--text); }
    .ver-todos { font-size: 13px; color: var(--primary); font-weight: 600; }
    .ver-todos:hover { color: var(--primary-dark); }

    .courses-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
    }
    .course-card {
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 20px; display: flex; flex-direction: column; gap: 10px;
    }
    .cc-top { display: flex; justify-content: space-between; align-items: center; }
    .cc-code { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 4px; background: rgba(124,58,237,0.08); color: var(--accent); }
    .cc-name { font-size: 16px; font-weight: 700; color: var(--text); }
    .cc-link {
      font-size: 13px; font-weight: 600; color: var(--primary);
      text-decoration: none; margin-top: 2px;
    }
    .cc-link:hover { color: var(--primary-dark); }

    .state-box {
      display: flex; align-items: center; gap: 10px; padding: 18px 20px;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      font-size: 14px; color: var(--text-muted);
    }
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }

    .empty-box {
      background: #fff; border: 1px dashed var(--border); border-radius: var(--radius-md);
      padding: 48px 24px; text-align: center;
    }
    .empty-icon {
      width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 14px;
      background: var(--surface-2); color: var(--text-muted);
      display: flex; align-items: center; justify-content: center; font-size: 24px;
    }
    .empty-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
    .empty-desc  { font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto; line-height: 1.6; }
  `]
})
export class DocenteDashboardComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  outcomes = signal<StudentOutcome[]>([]);
  levels   = signal<PerformanceEvaluation[]>([]);
  courses  = signal<{ code: string; name: string }[]>([]);
  pendingCount = signal(0);

  constructor(
    private assesment: AssesmentApiService,
    private users: UserApiService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      outcomes: this.assesment.getStudentOutcomes(),
      levels: this.assesment.getPerformanceEvaluations(),
      subjects: this.users.getSubjects(),
    }).subscribe({
      next: ({ outcomes, levels, subjects }) => {
        this.outcomes.set(outcomes ?? []);
        this.levels.set(levels ?? []);
        this.courses.set((subjects ?? []).map(s => ({ code: s.code ?? '', name: s.name ?? '' })));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la información. Verifica tu conexión con el servidor.');
        this.loading.set(false);
      },
    });
  }
}
