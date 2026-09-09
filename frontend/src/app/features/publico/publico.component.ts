import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AssesmentApiService } from '../../core/services/assesment-api.service';
import { UserApiService } from '../../core/services/user-api.service';
import { StudentOutcome, AssesmentResult, PerformanceEvaluationDetail, PerformanceEvaluation } from '../../core/models/abet.models';

interface OutcomeCard {
  code: string;
  desc: string;
  color: string;
  students: number;
  levels: { label: string; class: string; pct: number; barColor: string }[];
}

@Component({
  selector: 'app-publico',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pub-page">
      <header class="pub-header">
        <div class="pub-header-inner">
          <div class="pub-brand">
            <div class="brand-icon">M</div>
            <div>
              <div class="brand-name">MESOFTX</div>
              <div class="brand-sub">Vista pública · Indicadores ABET</div>
            </div>
          </div>
          <a routerLink="/auth/login" class="btn-login">Iniciar sesión</a>
        </div>
      </header>

      <div class="pub-content">
        <div class="pub-hero">
          <h1>Indicadores de Resultados de Aprendizaje ABET</h1>
          <p>Facultad de Ingeniería · Universidad Autónoma de Bucaramanga</p>
          <div class="pub-stats">
            <div class="pub-stat"><span class="ps-val">{{ outcomes().length }}</span><span class="ps-label">Student Outcomes</span></div>
            <div class="pub-stat"><span class="ps-val">{{ programsCount() }}</span><span class="ps-label">Programas</span></div>
            <div class="pub-stat"><span class="ps-val">{{ avgPct() !== null ? avgPct() + '%' : '—' }}</span><span class="ps-label">Promedio logro</span></div>
          </div>
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
          <div class="empty-icon"><i class="pi pi-inbox"></i></div>
          <div class="empty-title">Aún no hay indicadores publicados</div>
          <div class="empty-desc">Cuando la facultad parametrice los Student Outcomes y registre valoraciones, los indicadores aparecerán en esta vista.</div>
        </div>

        <!-- SO Cards -->
        <div class="so-grid" *ngIf="!loading() && outcomes().length > 0">
          <div class="so-pub-card" *ngFor="let so of outcomes()">
            <div class="so-card-header">
              <div class="so-pub-badge" [style.background]="so.color">{{ so.code }}</div>
              <div class="so-card-title">{{ so.desc }}</div>
            </div>
            <div class="so-levels">
              <div class="sl-row" *ngFor="let lv of so.levels">
                <span class="sl-label" [class]="lv.class">{{ lv.label }}</span>
                <div class="sl-track"><div class="sl-fill" [style.width]="lv.pct+'%'" [style.background]="lv.barColor"></div></div>
                <span class="sl-pct">{{ lv.pct }}%</span>
              </div>
            </div>
            <div class="so-card-footer">
              <span class="so-students">{{ so.students }} estudiantes valorados</span>
            </div>
          </div>
        </div>

        <div class="pub-note">
          <i class="pi pi-info-circle"></i>
          Esta vista es de acceso público y no requiere autenticación. Los datos son actualizados por los docentes de la facultad.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pub-page{min-height:100vh;background:var(--page-bg);font-family:'Inter',sans-serif;}
    .pub-header{background:#fff;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;}
    .pub-header-inner{max-width:1200px;margin:0 auto;padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;}
    .pub-brand{display:flex;align-items:center;gap:12px;}
    .brand-icon{width:36px;height:36px;background:var(--primary);color:#1A1A2E;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;}
    .brand-name{font-weight:800;font-size:15px;color:var(--text);}
    .brand-sub{font-size:11px;color:var(--text-muted);}
    .btn-login{background:var(--primary);color:#1A1A2E;padding:8px 20px;border-radius:var(--radius-sm);font-size:14px;font-weight:700;text-decoration:none;}
    .btn-login:hover{background:var(--primary-dark);color:#1A1A2E;}

    .pub-content{max-width:1200px;margin:0 auto;padding:40px 32px;}
    .pub-hero{text-align:center;margin-bottom:40px;}
    .pub-hero h1{font-size:28px;font-weight:800;color:var(--text);margin-bottom:8px;}
    .pub-hero p{font-size:14px;color:var(--text-muted);margin-bottom:24px;}
    .pub-stats{display:flex;justify-content:center;gap:40px;}
    .pub-stat{display:flex;flex-direction:column;align-items:center;}
    .ps-val{font-size:32px;font-weight:800;color:var(--primary);}
    .ps-label{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;}

    .so-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;margin-bottom:32px;}
    .so-pub-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;}
    .so-card-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;}
    .so-pub-badge{width:40px;height:40px;border-radius:8px;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;}
    .so-card-title{font-size:13px;font-weight:600;color:var(--text);line-height:1.5;}
    .so-levels{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
    .sl-row{display:flex;align-items:center;gap:10px;}
    .sl-label{width:100px;font-size:11px;font-weight:600;flex-shrink:0;}
    .sl-label.n4{color:var(--n4-color);}
    .sl-label.n3{color:var(--n3-color);}
    .sl-label.n2{color:var(--n2-color);}
    .sl-label.n1{color:var(--n1-color);}
    .sl-track{flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;}
    .sl-fill{height:100%;border-radius:4px;}
    .sl-pct{font-size:11px;font-weight:600;color:var(--text-muted);width:32px;text-align:right;}
    .so-card-footer{display:flex;justify-content:flex-end;align-items:center;}
    .so-students{font-size:12px;color:var(--text-muted);}

    .pub-note{display:flex;align-items:flex-start;gap:10px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);padding:16px 20px;font-size:13px;color:var(--text-muted);}
    .pub-note i{color:var(--accent);flex-shrink:0;margin-top:1px;}

    .state-box{display:flex;align-items:center;gap:10px;padding:18px 20px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);font-size:14px;color:var(--text-muted);margin-bottom:24px;}
    .notice{display:flex;align-items:center;gap:10px;background:rgba(255,165,2,0.08);border:1px solid rgba(255,165,2,0.25);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:24px;font-size:13px;color:var(--text-muted);}
    .notice i{color:var(--primary);flex-shrink:0;}
    .empty-box{background:#fff;border:1px dashed var(--border);border-radius:var(--radius-md);padding:48px 24px;text-align:center;margin-bottom:24px;}
    .empty-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 14px;background:var(--surface-2);color:var(--text-muted);display:flex;align-items:center;justify-content:center;font-size:24px;}
    .empty-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;}
    .empty-desc{font-size:13px;color:var(--text-muted);max-width:420px;margin:0 auto;line-height:1.6;}
  `]
})
export class PublicoComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  outcomes = signal<OutcomeCard[]>([]);
  programsCount = signal(0);
  avgPct = signal<number | null>(null);

  private palette = ['#7C3AED', '#0369A1', '#EA580C', '#16A34A', '#CA8A04', '#DC2626'];

  constructor(
    private assesment: AssesmentApiService,
    private users: UserApiService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      sos: this.assesment.getStudentOutcomes(),
      results: this.assesment.getAssesmentResults(),
      details: this.assesment.getPerformanceEvaluationDetails(),
      levels: this.assesment.getPerformanceEvaluations(),
      evidence: this.assesment.getAssesmentEvidence(),
      careers: this.users.getCareers(),
    }).subscribe({
      next: ({ sos, results, details, levels, evidence, careers }) => {
        this.programsCount.set((careers ?? []).length);
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
    evidence: { student_code: string; student_outcome_id: number }[],
  ): void {
    const levelById = new Map(levels.map(l => [l.id, l.evaluation_value]));
    const detailLevel = new Map<number, string>();
    details.forEach(d => {
      const lvl = levelById.get(d.performance_evaluation_id);
      if (lvl) detailLevel.set(d.id, lvl);
    });

    const levelMeta: { key: string; label: string; cls: string; color: string }[] = [
      { key: 'N4', label: 'Supera',          cls: 'n4', color: '#16A34A' },
      { key: 'N3', label: 'Bueno',           cls: 'n3', color: '#CA8A04' },
      { key: 'N2', label: 'En desarrollo',   cls: 'n2', color: '#EA580C' },
      { key: 'N1', label: 'Insatisfactorio', cls: 'n1', color: '#DC2626' },
    ];

    const scoreOf = (k: string) => ({ N4: 100, N3: 75, N2: 50, N1: 25 } as Record<string, number>)[k] ?? 0;
    const measured: number[] = [];

    const cards: OutcomeCard[] = sos.map((so, i) => {
      const soResults = results.filter(r => r.student_outcome_id === so.id);
      const total = soResults.length;
      const counts: Record<string, number> = { N4: 0, N3: 0, N2: 0, N1: 0 };
      soResults.forEach(r => {
        const lvl = detailLevel.get(r.performance_evaluation_detail_id);
        if (lvl && counts[lvl] !== undefined) counts[lvl]++;
      });
      if (total > 0) {
        const avg = Math.round(Object.entries(counts).reduce((a, [k, n]) => a + scoreOf(k) * n, 0) / total);
        measured.push(avg);
      }
      const studentsForSo = new Set(
        evidence.filter(e => e.student_outcome_id === so.id).map(e => e.student_code).filter(Boolean),
      ).size;

      return {
        code: so.code,
        desc: so.description ?? '',
        color: this.palette[i % this.palette.length],
        students: studentsForSo,
        levels: levelMeta.map(m => ({
          label: m.label,
          class: m.cls,
          pct: total ? Math.round((counts[m.key] / total) * 100) : 0,
          barColor: m.color,
        })),
      };
    });

    this.outcomes.set(cards);
    this.avgPct.set(measured.length ? Math.round(measured.reduce((a, b) => a + b, 0) / measured.length) : null);
  }
}
