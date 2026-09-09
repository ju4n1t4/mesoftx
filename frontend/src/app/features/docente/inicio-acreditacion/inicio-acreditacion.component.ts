import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { StudentOutcome, AssesmentResult, PerformanceEvaluationDetail, PerformanceEvaluation } from '../../../core/models/abet.models';

interface OutcomeRow { code: string; desc: string; pct: number; barColor: string; }

@Component({
  selector: 'app-inicio-acreditacion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-area">
      <!-- Hero naranja -->
      <div class="hero-banner">
        <div class="hero-badge">
          <i class="pi pi-check-circle"></i>
          <span>VISTA PÚBLICA · SIN AUTENTICACIÓN</span>
        </div>
        <h1>Resultados de Aprendizaje · Acreditación ABET</h1>
        <p>Indicadores de cumplimiento de los Student Outcomes de los programas de Ingeniería de la UNAB. Información pública para evaluadores del proceso de acreditación internacional ABET.</p>
      </div>

      <div class="state-box" *ngIf="loading()">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Cargando indicadores…</span>
      </div>

      <div class="notice" *ngIf="error()">
        <i class="pi pi-info-circle"></i>
        <span>{{ error() }} Se muestra la estructura en cero hasta que haya datos disponibles.</span>
      </div>

      <ng-container *ngIf="!loading()">
        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-box">
            <div class="sb-val green">{{ globalPct() !== null ? globalPct() + '%' : '—' }}</div>
            <div class="sb-label">Cumplimiento global</div>
          </div>
          <div class="stat-box">
            <div class="sb-val orange">{{ inMeta() }}<span class="sb-sub">/{{ outcomes().length }}</span></div>
            <div class="sb-label">Outcomes en meta</div>
          </div>
          <div class="stat-box">
            <div class="sb-val purple">{{ studentsEvaluated() }}</div>
            <div class="sb-label">Estudiantes evaluados</div>
          </div>
          <div class="stat-box">
            <div class="sb-val dark">{{ outcomes().length }}</div>
            <div class="sb-label">Student Outcomes</div>
          </div>
        </div>

        <!-- Tabla de cumplimiento por SO -->
        <div class="compliance-card">
          <div class="cc-header">
            <div>
              <div class="cc-title">Cumplimiento por Student Outcome</div>
              <div class="cc-sub">Indicadores según criterios ABET</div>
            </div>
          </div>

          <div class="empty-inline" *ngIf="outcomes().length === 0">
            <i class="pi pi-inbox"></i>
            <span>Aún no se han parametrizado Student Outcomes en el sistema.</span>
          </div>

          <div class="so-list" *ngIf="outcomes().length > 0">
            <div class="so-row" *ngFor="let so of outcomes()">
              <span class="so-code">{{ so.code }}</span>
              <span class="so-desc">{{ so.desc }}</span>
              <div class="so-bar-wrap">
                <div class="so-bar-track">
                  <div class="so-bar-fill" [style.width]="so.pct+'%'" [style.background]="so.barColor"></div>
                </div>
              </div>
              <span class="so-pct" [style.color]="so.barColor">{{ so.pct }}%</span>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .hero-banner {
      background: linear-gradient(135deg, var(--primary) 0%, #E08C00 100%);
      border-radius: var(--radius-lg); padding: 32px 36px; margin-bottom: 20px;
      position: relative; overflow: hidden;
    }
    .hero-banner::after {
      content: ''; position: absolute; top: -60px; right: -60px;
      width: 240px; height: 240px; border-radius: 50%;
      background: rgba(255,255,255,0.1); pointer-events: none;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.9);
      font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
      padding: 4px 12px; border-radius: 20px; margin-bottom: 14px;
    }
    .hero-banner h1 { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 10px; line-height: 1.25; }
    .hero-banner p  { font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.65; margin-bottom: 0; max-width: 640px; }

    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;
    }
    .stat-box {
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 20px 24px;
    }
    .sb-val { font-size: 32px; font-weight: 800; line-height: 1; margin-bottom: 6px; }
    .sb-val.green  { color: var(--badge-open); }
    .sb-val.orange { color: var(--primary); }
    .sb-val.purple { color: var(--accent); }
    .sb-val.dark   { color: var(--text); }
    .sb-sub { font-size: 18px; color: var(--text-muted); font-weight: 400; }
    .sb-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

    .compliance-card {
      background: #fff; border: 1px solid var(--border);
      border-radius: var(--radius-md); overflow: hidden; margin-bottom: 20px;
    }
    .cc-header { padding: 18px 24px; border-bottom: 1px solid var(--border); }
    .cc-title { font-size: 16px; font-weight: 700; color: var(--text); }
    .cc-sub   { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    .so-list { padding: 8px 0; }
    .so-row {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 24px; transition: background 0.15s;
    }
    .so-row:hover { background: var(--surface-2); }
    .so-code { font-size: 12px; font-weight: 700; color: var(--accent); width: 44px; flex-shrink: 0; }
    .so-desc { font-size: 13px; color: var(--text); width: 340px; flex-shrink: 0; }
    .so-bar-wrap { flex: 1; }
    .so-bar-track { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
    .so-bar-fill  { height: 100%; border-radius: 4px; transition: width 0.4s; }
    .so-pct { font-size: 13px; font-weight: 700; width: 42px; text-align: right; flex-shrink: 0; }

    .empty-inline {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 40px 24px; color: var(--text-muted); font-size: 13px;
    }
    .empty-inline i { font-size: 18px; }

    .state-box {
      display: flex; align-items: center; gap: 10px; padding: 18px 20px;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      font-size: 14px; color: var(--text-muted);
    }
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }
  `]
})
export class InicioAcreditacionComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  outcomes = signal<OutcomeRow[]>([]);
  globalPct = signal<number | null>(null);
  inMeta = signal(0);
  studentsEvaluated = signal(0);

  private readonly META = 80;

  constructor(private assesment: AssesmentApiService) {}

  ngOnInit(): void {
    forkJoin({
      sos: this.assesment.getStudentOutcomes(),
      results: this.assesment.getAssesmentResults(),
      details: this.assesment.getPerformanceEvaluationDetails(),
      levels: this.assesment.getPerformanceEvaluations(),
      evidence: this.assesment.getAssesmentEvidence(),
    }).subscribe({
      next: ({ sos, results, details, levels, evidence }) => {
        this.compute(sos ?? [], results ?? [], details ?? [], levels ?? [], evidence ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los indicadores. Verifica la conexión con el servidor.');
        this.loading.set(false);
      },
    });
  }

  private compute(
    sos: StudentOutcome[],
    results: AssesmentResult[],
    details: PerformanceEvaluationDetail[],
    levels: PerformanceEvaluation[],
    evidence: { student_code: string }[],
  ): void {
    // Mapa detalle -> nivel (N1..N4)
    const levelById = new Map(levels.map(l => [l.id, l.evaluation_value]));
    const detailLevel = new Map<number, string>();
    details.forEach(d => {
      const lvl = levelById.get(d.performance_evaluation_id);
      if (lvl) detailLevel.set(d.id, lvl);
    });

    const levelScore = (lvl: string): number => {
      const v = lvl.trim().toLowerCase();
      // Acepta tanto códigos (N1..N4) como etiquetas del backend
      if (v === 'n4' || v.includes('supera')) return 100;
      if (v === 'n3' || v.includes('bueno')) return 75;
      if (v === 'n2' || v.includes('desarrollo')) return 50;
      if (v === 'n1' || v.includes('insatisfactorio')) return 25;
      return 0;
    };

    const rows: OutcomeRow[] = sos.map(so => {
      const soResults = results.filter(r => r.student_outcome_id === so.id);
      let pct = 0;
      if (soResults.length) {
        const sum = soResults.reduce((acc, r) => acc + levelScore(detailLevel.get(r.performance_evaluation_detail_id) ?? ''), 0);
        pct = Math.round(sum / soResults.length);
      }
      return { code: so.code, desc: so.description ?? '', pct, barColor: this.barColor(pct) };
    });

    this.outcomes.set(rows);
    this.inMeta.set(rows.filter(r => r.pct >= this.META).length);

    const measured = rows.filter(r => r.pct > 0);
    this.globalPct.set(measured.length ? Math.round(measured.reduce((a, r) => a + r.pct, 0) / measured.length) : null);

    const uniqueStudents = new Set(evidence.map(e => e.student_code).filter(Boolean));
    this.studentsEvaluated.set(uniqueStudents.size);
  }

  private barColor(pct: number): string {
    if (pct >= 80) return '#16A34A';
    if (pct >= 70) return '#CA8A04';
    if (pct > 0)   return '#DC2626';
    return 'var(--border)';
  }
}
