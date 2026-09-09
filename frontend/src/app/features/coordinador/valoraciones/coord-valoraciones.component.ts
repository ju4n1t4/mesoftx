import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { AssesmentResult, StudentOutcome } from '../../../core/models/abet.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-coord-valoraciones',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Valoraciones por curso</h1>
        <p>Estado de las valoraciones registradas por los docentes.</p>
      </div>

      <div class="state-box" *ngIf="loading()"><i class="pi pi-spin pi-spinner"></i> Cargando valoraciones…</div>
      <div class="notice" *ngIf="error()"><i class="pi pi-info-circle"></i> <span>{{ error() }}</span></div>

      <ng-container *ngIf="!loading()">
        <div class="stats-row">
          <div class="stat-box"><div class="sb-val">{{ results().length }}</div><div class="sb-label">Valoraciones registradas</div></div>
          <div class="stat-box"><div class="sb-val">{{ evidenceCount() }}</div><div class="sb-label">Evidencias cargadas</div></div>
          <div class="stat-box"><div class="sb-val">{{ sosCount() }}</div><div class="sb-label">Student Outcomes</div></div>
        </div>

        <div class="empty-state" *ngIf="results().length === 0">
          <div class="empty-icon"><i class="pi pi-check-square"></i></div>
          <div class="empty-title">No hay valoraciones registradas</div>
          <div class="empty-desc">Aún no se han registrado resultados de valoración en la base de datos.</div>
        </div>

        <div class="table-card" *ngIf="results().length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Materia (código)</th>
                <th>Student Outcome</th>
                <th>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of results()">
                <td><span class="code-tag">{{ r.subject_code }}</span></td>
                <td class="so-cell">{{ soCode(r.student_outcome_id) }}</td>
                <td class="ev-cell">#{{ r.assesment_evidence_id }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .state-box { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; }
    .state-box i { margin-right: 6px; }
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }
    .empty-state { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 48px; text-align: center; }
    .empty-icon { font-size: 40px; color: var(--border); margin-bottom: 12px; }
    .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); }

    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
    .stat-box { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 24px; text-align: center; }
    .sb-val { font-size: 32px; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 6px; }
    .sb-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

    .table-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--surface-2); border-bottom: 1px solid var(--border); }
    .data-table tbody td { padding: 13px 16px; border-bottom: 1px solid var(--border); font-size: 14px; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover td { background: #F9FAFB; }
    .code-tag { font-size: 12px; font-weight: 700; color: var(--accent); background: rgba(124,58,237,0.08); padding: 3px 9px; border-radius: 4px; }
    .so-cell { font-weight: 600; color: var(--text); }
    .ev-cell { color: var(--text-muted); font-size: 13px; }
  `]
})
export class CoordValoracionesComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  results = signal<AssesmentResult[]>([]);
  sos     = signal<StudentOutcome[]>([]);
  evidenceCount = signal(0);
  sosCount      = signal(0);

  constructor(private assesment: AssesmentApiService) {}

  ngOnInit() {
    forkJoin({
      results:  this.assesment.getAssesmentResults(),
      sos:      this.assesment.getStudentOutcomes(),
      evidence: this.assesment.getAssesmentEvidence(),
    }).subscribe({
      next: (r) => {
        this.results.set(r.results);
        this.sos.set(r.sos);
        this.sosCount.set(r.sos.length);
        this.evidenceCount.set(r.evidence.length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con el servicio. Verifica que los microservicios estén activos.');
        this.loading.set(false);
      },
    });
  }

  soCode(id: number) { return this.sos().find(s => s.id === id)?.code ?? '—'; }
}
