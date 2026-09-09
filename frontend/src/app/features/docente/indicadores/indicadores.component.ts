import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { StudentOutcome, AssesmentResult, PerformanceEvaluationDetail, PerformanceEvaluation } from '../../../core/models/abet.models';

interface OutcomeItem {
  id: string;
  label: string;
  pct: number;
  status: string;
  statusClass: string;
}

@Component({
  selector: 'app-indicadores',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Mis indicadores ABET</h1>
        <p>Cumplimiento promedio por Student Outcome frente a la meta institucional (80%).</p>
      </div>

      <div class="state-box" *ngIf="loading()">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Cargando indicadores…</span>
      </div>

      <div class="notice" *ngIf="error()">
        <i class="pi pi-info-circle"></i>
        <span>{{ error() }}</span>
      </div>

      <div class="empty-box" *ngIf="!loading() && outcomes().length === 0">
        <div class="empty-icon"><i class="pi pi-chart-line"></i></div>
        <div class="empty-title">Todavía no hay indicadores</div>
        <div class="empty-desc">Cuando se parametricen los Student Outcomes y registres valoraciones, aquí verás tu desempeño por outcome.</div>
      </div>

      <div class="ind-grid" *ngIf="!loading() && outcomes().length > 0">
        <!-- Radar chart -->
        <div class="card radar-card">
          <div class="card-title">Cumplimiento por Outcome</div>
          <div class="radar-wrap">
            <svg viewBox="0 0 300 300" class="radar-svg">
              <g *ngFor="let ring of [0.25, 0.5, 0.75, 1.0]">
                <polygon
                  [attr.points]="ringPoints(ring)"
                  fill="none"
                  [attr.stroke]="ring === 0.75 ? 'rgba(255,165,2,0.25)' : 'var(--border)'"
                  [attr.stroke-width]="ring === 0.75 ? '1.5' : '1'"
                  [attr.stroke-dasharray]="ring === 0.75 ? '4 3' : ''"/>
              </g>
              <line *ngFor="let ax of axes()"
                    [attr.x1]="150" [attr.y1]="150"
                    [attr.x2]="ax.x2" [attr.y2]="ax.y2"
                    stroke="var(--border)" stroke-width="1"/>
              <polygon
                [attr.points]="ringPoints(0.8)"
                fill="rgba(255,165,2,0.08)"
                stroke="rgba(255,165,2,0.4)"
                stroke-width="1.5"
                stroke-dasharray="5 3"/>
              <polygon
                [attr.points]="dataPoints()"
                fill="rgba(124,58,237,0.15)"
                stroke="var(--accent)"
                stroke-width="2"/>
              <circle *ngFor="let p of dataPointsArr()"
                [attr.cx]="p.x" [attr.cy]="p.y" r="4"
                fill="var(--accent)" stroke="#fff" stroke-width="2"/>
              <text *ngFor="let ax of axes()"
                    [attr.x]="ax.lx" [attr.y]="ax.ly"
                    text-anchor="middle" dominant-baseline="middle"
                    font-size="12" font-weight="700" fill="var(--text-muted)">
                {{ ax.label }}
              </text>
            </svg>
            <div class="radar-legend">
              <div class="legend-item"><span class="legend-dot accent"></span>Mi desempeño</div>
              <div class="legend-item"><span class="legend-sq orange"></span>Meta ABET 80%</div>
            </div>
          </div>
        </div>

        <!-- Detalle por Outcome -->
        <div class="card detail-card">
          <div class="card-title">Detalle por Outcome</div>
          <div class="outcome-list">
            <div class="outcome-row" *ngFor="let o of outcomes()">
              <div class="or-id">{{ o.id }}</div>
              <div class="or-body">
                <div class="or-label">{{ o.label }}</div>
                <div class="or-bar-wrap">
                  <div class="or-bar-track">
                    <div class="or-bar-fill"
                         [style.width]="o.pct + '%'"
                         [style.background]="barColor(o.pct)"></div>
                    <div class="or-meta-line"></div>
                  </div>
                </div>
              </div>
              <div class="or-right">
                <span class="or-pct" [style.color]="barColor(o.pct)">{{ o.pct }}%</span>
                <span class="or-status" [class]="o.statusClass">{{ o.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ind-grid { display: grid; grid-template-columns: 340px 1fr; gap: 16px; }
    .card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; }
    .card-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 16px; }

    .radar-wrap { display: flex; flex-direction: column; align-items: center; }
    .radar-svg  { width: 100%; max-width: 280px; }
    .radar-legend { display: flex; gap: 20px; margin-top: 12px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
    .legend-dot.accent { background: var(--accent); }
    .legend-sq { width: 16px; height: 6px; background: rgba(255,165,2,0.3); border: 1px dashed var(--primary); border-radius: 2px; }

    .outcome-list { display: flex; flex-direction: column; gap: 14px; }
    .outcome-row { display: flex; align-items: center; gap: 12px; }
    .or-id {
      width: 28px; height: 28px; border-radius: 50%; background: var(--accent);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; flex-shrink: 0;
    }
    .or-body { flex: 1; }
    .or-label { font-size: 13px; color: var(--text); margin-bottom: 6px; }
    .or-bar-wrap { position: relative; }
    .or-bar-track { height: 8px; background: var(--border); border-radius: 4px; position: relative; overflow: visible; }
    .or-bar-fill  { height: 100%; border-radius: 4px; transition: width 0.4s; }
    .or-meta-line {
      position: absolute; top: -3px; bottom: -3px;
      left: 80%; width: 2px; background: var(--primary); border-radius: 1px;
    }
    .or-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; width: 80px; }
    .or-pct  { font-size: 13px; font-weight: 700; }
    .or-status {
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;
    }
    .or-status.done     { background: var(--badge-open-bg);    color: var(--badge-open); }
    .or-status.progress { background: var(--badge-pending-bg); color: var(--badge-pending); }
    .or-status.risk     { background: var(--badge-expired-bg); color: var(--badge-expired); }

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
export class IndicadoresComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  outcomes = signal<OutcomeItem[]>([]);

  private readonly CX = 150;
  private readonly CY = 150;
  private readonly R  = 100;

  axes = signal<{ x2: number; y2: number; lx: number; ly: number; label: string }[]>([]);

  constructor(private assesment: AssesmentApiService) {}

  ngOnInit(): void {
    forkJoin({
      sos: this.assesment.getStudentOutcomes(),
      results: this.assesment.getAssesmentResults(),
      details: this.assesment.getPerformanceEvaluationDetails(),
      levels: this.assesment.getPerformanceEvaluations(),
    }).subscribe({
      next: ({ sos, results, details, levels }) => {
        this.compute(sos ?? [], results ?? [], details ?? [], levels ?? []);
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
  ): void {
    const levelById = new Map(levels.map(l => [l.id, l.evaluation_value]));
    const detailLevel = new Map<number, string>();
    details.forEach(d => {
      const lvl = levelById.get(d.performance_evaluation_id);
      if (lvl) detailLevel.set(d.id, lvl);
    });
    const scoreOf = (k: string) => ({ N4: 100, N3: 75, N2: 50, N1: 25 } as Record<string, number>)[k] ?? 0;

    const items: OutcomeItem[] = sos.map((so, i) => {
      const soResults = results.filter(r => r.student_outcome_id === so.id);
      let pct = 0;
      if (soResults.length) {
        pct = Math.round(soResults.reduce((a, r) => a + scoreOf(detailLevel.get(r.performance_evaluation_detail_id) ?? ''), 0) / soResults.length);
      }
      return { id: `O${i + 1}`, label: so.description ?? so.code, pct, ...this.statusFor(pct) };
    });

    this.outcomes.set(items);
    this.buildAxes(items.length);
  }

  private statusFor(pct: number): { status: string; statusClass: string } {
    if (pct >= 80) return { status: 'Cumplido',   statusClass: 'done' };
    if (pct >= 70) return { status: 'En proceso', statusClass: 'progress' };
    if (pct > 0)   return { status: 'En riesgo',  statusClass: 'risk' };
    return { status: 'Sin datos', statusClass: 'progress' };
  }

  private buildAxes(n: number): void {
    const count = Math.max(n, 3);
    this.axes.set(Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI / 2) + (2 * Math.PI * i / count);
      return {
        x2: this.CX + this.R * Math.cos(angle),
        y2: this.CY - this.R * Math.sin(angle),
        lx: this.CX + (this.R + 18) * Math.cos(angle),
        ly: this.CY - (this.R + 18) * Math.sin(angle),
        label: `O${i + 1}`,
      };
    }));
  }

  ringPoints(scale: number): string {
    const n = Math.max(this.outcomes().length, 3);
    return Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI / 2) + (2 * Math.PI * i / n);
      const x = this.CX + this.R * scale * Math.cos(angle);
      const y = this.CY - this.R * scale * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  }

  dataPointsArr() {
    const items = this.outcomes();
    const n = Math.max(items.length, 3);
    return items.map((o, i) => {
      const scale = o.pct / 100;
      const angle = (Math.PI / 2) + (2 * Math.PI * i / n);
      return {
        x: this.CX + this.R * scale * Math.cos(angle),
        y: this.CY - this.R * scale * Math.sin(angle),
      };
    });
  }

  dataPoints(): string {
    return this.dataPointsArr().map(p => `${p.x},${p.y}`).join(' ');
  }

  barColor(pct: number): string {
    if (pct >= 80) return 'var(--badge-open)';
    if (pct >= 70) return 'var(--n2-color)';
    if (pct > 0)   return 'var(--badge-expired)';
    return 'var(--border)';
  }
}
