import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssesmentApiService } from '../../../../core/services/assesment-api.service';
import { UserApiService } from '../../../../core/services/user-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  StudentOutcome, PerformanceIndicatorDetail, PerformanceEvaluationDetail,
} from '../../../../core/models/abet.models';
import { forkJoin, of, catchError } from 'rxjs';

const LEVELS = [
  { key: 'n1', label: 'Insatisfactorio', dotColor: '#DC2626' },
  { key: 'n2', label: 'En desarrollo',   dotColor: '#EA580C' },
  { key: 'n3', label: 'Bueno',           dotColor: '#CA8A04' },
  { key: 'n4', label: 'Supera',          dotColor: '#16A34A' },
];

interface RubricRow {
  indicatorId: number;
  code: string;
  desc: string;
  n1: string; n2: string; n3: string; n4: string;
  // performance_evaluation_detail_id asociado a cada nivel (0 si no existe)
  n1Id: number; n2Id: number; n3Id: number; n4Id: number;
}

@Component({
  selector: 'app-registrar-valoracion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rv-shell">
      <div class="rv-body">
        <div class="content-area">

          <div class="rv-breadcrumb">
            <span class="bc-link">Mis cursos</span>
            <i class="pi pi-chevron-right bc-sep"></i>
            <span class="bc-cur">Registrar valoración</span>
          </div>

          <div class="rv-header">
            <h1>Valoración por rúbrica</h1>
            <p>Elige el Student Outcome para cargar su rúbrica de identificadores y niveles de logro. Luego valora al estudiante seleccionando la celda que corresponde a su desempeño.</p>
          </div>

          <div class="state-box" *ngIf="loading()"><i class="pi pi-spin pi-spinner"></i> Cargando…</div>
          <div class="notice" *ngIf="error()"><i class="pi pi-info-circle"></i> <span>{{ error() }}</span></div>

          <div class="block-card" *ngIf="!loading() && blocked()">
            <div class="block-icon"><i class="pi pi-lock"></i></div>
            <div class="block-body">
              <div class="block-title">Registro de valoraciones no disponible</div>
              <div class="block-desc">
                El programa <strong>{{ careerName() }}</strong> no se encuentra en estado de acreditación activo,
                por lo que el registro de valoraciones ABET está deshabilitado. Contacta al coordinador del programa
                para habilitar el proceso.
              </div>
            </div>
          </div>

          <ng-container *ngIf="!loading() && !blocked()">
            <!-- Sin SO -->
            <div class="empty-state" *ngIf="outcomes().length === 0">
              <div class="empty-icon"><i class="pi pi-inbox"></i></div>
              <div class="empty-title">No hay Student Outcomes disponibles</div>
              <div class="empty-desc">El coordinador aún no ha parametrizado ninguna rúbrica en la base de datos.</div>
            </div>

            <ng-container *ngIf="outcomes().length > 0">
              <div class="section-label">STUDENT OUTCOME A EVALUAR</div>
              <div class="so-tabs">
                <button *ngFor="let so of outcomes()" class="so-tab"
                        [class.active]="selectedId() === so.id"
                        (click)="selectedId.set(so.id)">
                  {{ so.code }}
                </button>
              </div>

              <div class="so-desc-card" *ngIf="selectedSO() as so">
                <div class="so-badge">{{ so.code }}</div>
                <div>
                  <div class="so-desc-title">Descripción del Student Outcome</div>
                  <div class="so-desc-text">{{ so.description || 'Sin descripción registrada.' }}</div>
                </div>
              </div>

              <div class="eval-context">
                <div class="ctx-field">
                  <label>Código del estudiante</label>
                  <input type="text" [value]="studentCode()" (input)="studentCode.set($any($event.target).value)" placeholder="Ej: 202410001" />
                </div>
                <div class="ctx-field">
                  <label>Código de la materia</label>
                  <input type="text" [value]="subjectCode()" (input)="subjectCode.set($any($event.target).value)" placeholder="Ej: ISIS-1104" />
                </div>
                <div class="ctx-field">
                  <label>Nombre de la evidencia</label>
                  <input type="text" [value]="evidenceName()" (input)="evidenceName.set($any($event.target).value)" placeholder="Ej: Proyecto final" />
                </div>
              </div>

              <!-- Rúbrica -->
              <div class="rubric-card">
                <div class="rubric-bar">
                  <span class="rb-title">Rúbrica · Identificadores de desempeño</span>
                  <span class="rb-hint" *ngIf="currentRows().length > 0">Haz clic en la celda que describe el desempeño del estudiante</span>
                  <span class="rb-so">{{ selectedSO()?.code }}</span>
                </div>
                <div class="rubric-scroll">
                  <table class="rubric-table">
                    <thead>
                      <tr>
                        <th class="th-id">ID · DETALLE</th>
                        <th *ngFor="let lv of levels" [class]="'th-' + lv.key">
                          <span class="lv-dot" [style.background]="lv.dotColor"></span>{{ lv.label }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let row of currentRows()">
                        <td class="td-id">
                          <div class="id-code">{{ row.code }}</div>
                          <div class="id-desc">{{ row.desc }}</div>
                        </td>
                        <td *ngFor="let lv of levels" class="td-cell">
                          <div class="r-cell"
                               [class]="getCellClass(row.indicatorId, lv.key)"
                               (click)="selectCell(row.indicatorId, lv.key)">
                            {{ getDesc(row, lv.key) }}
                          </div>
                        </td>
                      </tr>
                      <tr *ngIf="currentRows().length === 0">
                        <td colspan="5" class="rubric-empty">Sin identificadores configurados para {{ selectedSO()?.code }}.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </ng-container>
          </ng-container>

        </div>
      </div>

      <!-- Barra inferior fija -->
      <div class="rv-footer" *ngIf="!loading() && !blocked() && outcomes().length > 0">
        <div class="footer-left">
          <span class="footer-txt" *ngIf="!saveMsg()">{{ ratedIndicators() }} de {{ currentRows().length }} identificadores valorados en {{ selectedSO()?.code }}</span>
          <span class="footer-msg" [class.ok]="saveOk()" [class.err]="!saveOk()" *ngIf="saveMsg()">
            <i class="pi" [class.pi-check-circle]="saveOk()" [class.pi-exclamation-triangle]="!saveOk()"></i> {{ saveMsg() }}
          </span>
        </div>
        <div class="footer-right">
          <button class="btn-save" [disabled]="currentRows().length === 0 || saving()" (click)="confirmSave()">
            <span *ngIf="!saving()">Guardar valoración <i class="pi pi-arrow-right"></i></span>
            <span *ngIf="saving()"><i class="pi pi-spin pi-spinner"></i> Guardando…</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rv-shell { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--page-bg); }
    .rv-body  { flex: 1; overflow-y: auto; }

    .rv-breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; }
    .bc-link { color: var(--text-muted); }
    .bc-sep { font-size: 10px; color: var(--text-light); }
    .bc-cur { color: var(--text); font-weight: 500; }

    .rv-header { margin-bottom: 20px; }
    .rv-header h1 { font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
    .rv-header p  { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

    .state-box { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; }
    .state-box i { margin-right: 6px; }
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }
    .empty-state { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 48px; text-align: center; }
    .empty-icon { font-size: 40px; color: var(--border); margin-bottom: 12px; }
    .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); }

    .block-card { display: flex; align-items: flex-start; gap: 16px; background: rgba(220,38,38,0.05); border: 1px solid rgba(220,38,38,0.25); border-radius: var(--radius-md); padding: 20px 24px; }
    .block-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(220,38,38,0.12); color: var(--badge-expired); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .block-title { font-size: 15px; font-weight: 700; color: var(--badge-expired); margin-bottom: 4px; }
    .block-desc { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

    .section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.08em; margin-bottom: 10px; }
    .so-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .so-tab { padding: 7px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; border: 1px solid var(--border); background: #fff; color: var(--text-muted); cursor: pointer; font-family: inherit; transition: all 0.15s; }
    .so-tab:hover { border-color: var(--primary); color: var(--primary); }
    .so-tab.active { background: var(--primary); border-color: var(--primary); color: #1A1A2E; }

    .so-desc-card { display: flex; align-items: flex-start; gap: 14px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 16px; }
    .so-badge { min-width: 44px; height: 40px; padding: 0 8px; border-radius: 10px; background: var(--primary); color: #1A1A2E; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0; }
    .so-desc-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .so-desc-text { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

    .eval-context { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .ctx-field { display: flex; flex-direction: column; gap: 6px; }
    .ctx-field label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .ctx-field input { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-family: inherit; color: var(--text); background: #fff; }
    .ctx-field input:focus { outline: none; border-color: var(--primary); }

    .footer-msg { font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
    .footer-msg.ok { color: var(--n4-color); }
    .footer-msg.err { color: var(--n1-color); }

    .rubric-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 8px; }
    .rubric-bar { display: flex; align-items: center; gap: 10px; padding: 13px 20px; border-bottom: 1px solid var(--border); }
    .rb-title { font-size: 14px; font-weight: 700; color: var(--text); white-space: nowrap; }
    .rb-hint { font-size: 12px; color: var(--text-muted); flex: 1; }
    .rb-so { font-size: 11px; font-weight: 700; background: var(--accent); color: #fff; padding: 3px 10px; border-radius: 4px; flex-shrink: 0; margin-left: auto; }
    .rubric-scroll { overflow-x: auto; }
    .rubric-table { width: 100%; border-collapse: collapse; }
    .rubric-table thead th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; background: var(--surface-2); border-bottom: 2px solid var(--border); }
    .th-id { width: 190px; color: var(--text-muted); }
    .th-n1 { color: var(--n1-color); } .th-n2 { color: var(--n2-color); } .th-n3 { color: var(--n3-color); } .th-n4 { color: var(--n4-color); }
    .lv-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; vertical-align: middle; }
    .rubric-table tbody td { border-bottom: 1px solid var(--border); vertical-align: top; }
    .rubric-table tbody tr:last-child td { border-bottom: none; }
    .td-id { padding: 12px 14px; width: 190px; }
    .td-cell { padding: 8px 10px; min-width: 185px; }
    .id-code { font-size: 13px; font-weight: 700; color: var(--text); }
    .id-desc { font-size: 11px; color: var(--text-muted); margin-top: 3px; line-height: 1.45; }
    .r-cell { padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s; font-size: 12px; line-height: 1.55; background: #fff; min-height: 58px; }
    .r-cell:hover { border-color: var(--text-muted); background: var(--surface-2); }
    .r-cell.sel-n1 { background: var(--n1-bg); border-color: var(--n1-color); }
    .r-cell.sel-n2 { background: var(--n2-bg); border-color: var(--n2-color); }
    .r-cell.sel-n3 { background: var(--n3-bg); border-color: var(--n3-color); }
    .r-cell.sel-n4 { background: var(--n4-bg); border-color: var(--n4-color); }
    .rubric-empty { padding: 32px; text-align: center; color: var(--text-muted); font-size: 13px; }

    .rv-footer { flex-shrink: 0; background: #fff; border-top: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .footer-left { flex: 1; min-width: 0; }
    .footer-txt { font-size: 13px; color: var(--text-muted); }
    .footer-right { display: flex; gap: 10px; flex-shrink: 0; }
    .btn-draft { padding: 10px 20px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #fff; color: var(--text); font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
    .btn-draft:hover { border-color: var(--text-muted); }
    .btn-save { padding: 10px 22px; border-radius: var(--radius-sm); border: none; background: var(--primary); color: #1A1A2E; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 8px; }
    .btn-save:hover:not(:disabled) { background: var(--primary-dark); }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class RegistrarValoracionComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  blocked     = signal(false);
  careerName  = signal('');
  selectedId = signal<number | null>(null);

  outcomes  = signal<StudentOutcome[]>([]);
  piDetails = signal<PerformanceIndicatorDetail[]>([]);
  peDetails = signal<PerformanceEvaluationDetail[]>([]);
  levels    = LEVELS;

  studentCode  = signal('');
  subjectCode  = signal('');
  evidenceName = signal('');
  saving  = signal(false);
  saveMsg = signal('');
  saveOk  = signal(false);

  private selections: Record<number, string> = {};

  selectedSO = computed(() => this.outcomes().find(s => s.id === this.selectedId()) ?? null);

  currentRows = computed<RubricRow[]>(() => {
    const soId = this.selectedId();
    if (!soId) return [];
    const details = this.piDetails().filter(d => d.student_outcome_id === soId);
    return details.map((d, i) => {
      const evals = this.peDetails().filter(
        e => e.performance_indicator_id === d.performance_indicator_id && e.student_outcome_id === soId
      );
      return {
        indicatorId: d.performance_indicator_id,
        code: `ID${i + 1}`,
        desc: d.description,
        n1: evals[0]?.description ?? '',
        n2: evals[1]?.description ?? '',
        n3: evals[2]?.description ?? '',
        n4: evals[3]?.description ?? '',
        n1Id: evals[0]?.id ?? 0,
        n2Id: evals[1]?.id ?? 0,
        n3Id: evals[2]?.id ?? 0,
        n4Id: evals[3]?.id ?? 0,
      };
    });
  });

  constructor(
    private assesment: AssesmentApiService,
    private users: UserApiService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    const careerId = this.auth.user()?.career_id ?? 0;
    const career$ = careerId > 0 && !this.auth.isDemo()
      ? this.users.getCareer(careerId).pipe(catchError(() => of(null)))
      : of(null);

    forkJoin({
      sos:    this.assesment.getStudentOutcomes(),
      piDet:  this.assesment.getPerformanceIndicatorDetails(),
      peDet:  this.assesment.getPerformanceEvaluationDetails(),
      career: career$,
    }).subscribe({
      next: (r) => {
        if (r.career) {
          this.careerName.set(r.career.name);
          const validYear = r.career.accreditation_end_year == null
            || r.career.accreditation_end_year >= new Date().getFullYear();
          this.blocked.set(!r.career.accredited || !validYear);
        }
        this.outcomes.set(r.sos);
        this.piDetails.set(r.piDet);
        this.peDetails.set(r.peDet);
        if (r.sos.length > 0) this.selectedId.set(r.sos[0].id);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con el servicio. Verifica que los microservicios estén activos.');
        this.loading.set(false);
      },
    });
  }

  selectCell(indicatorId: number, levelKey: string) {
    if (this.selections[indicatorId] === levelKey) delete this.selections[indicatorId];
    else this.selections[indicatorId] = levelKey;
    this.saveMsg.set('');
  }

  getCellClass(indicatorId: number, levelKey: string): string {
    return this.selections[indicatorId] === levelKey ? `sel-${levelKey}` : '';
  }

  getDesc(row: RubricRow, key: string): string {
    const map: Record<string, keyof RubricRow> = { n1:'n1', n2:'n2', n3:'n3', n4:'n4' };
    return (row[map[key]] as string) ?? '';
  }

  ratedIndicators() { return Object.keys(this.selections).length; }

  private evalDetailIdFor(row: RubricRow, levelKey: string): number {
    const map: Record<string, number> = { n1: row.n1Id, n2: row.n2Id, n3: row.n3Id, n4: row.n4Id };
    return map[levelKey] ?? 0;
  }

  confirmSave() {
    if (this.blocked()) return;
    const so = this.selectedSO();
    if (!so) return;

    const student = this.studentCode().trim();
    const subject = this.subjectCode().trim();
    const evidence = this.evidenceName().trim();

    if (!student || !subject || !evidence) {
      this.saveOk.set(false);
      this.saveMsg.set('Completa código del estudiante, código de la materia y nombre de la evidencia.');
      return;
    }

    const rows = this.currentRows();
    const results = rows
      .filter(r => this.selections[r.indicatorId])
      .map(r => ({
        subject_code: subject,
        student_outcome_id: so.id,
        performance_evaluation_detail_id: this.evalDetailIdFor(r, this.selections[r.indicatorId]),
      }))
      .filter(r => r.performance_evaluation_detail_id > 0);

    if (results.length === 0) {
      this.saveOk.set(false);
      this.saveMsg.set('Selecciona al menos un nivel de logro con una evaluación válida.');
      return;
    }

    const payload = {
      evidence_name_doc: evidence,
      student_code: student,
      student_outcome_id: so.id,
      results,
    };

    this.saving.set(true);
    this.saveMsg.set('');
    this.assesment.createEvidenceWithResults(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveOk.set(true);
        this.saveMsg.set(`Valoración guardada: ${results.length} resultado(s) para ${student} en ${so.code}.`);
        this.selections = {};
        this.studentCode.set('');
        this.evidenceName.set('');
      },
      error: () => {
        this.saving.set(false);
        this.saveOk.set(false);
        this.saveMsg.set('No se pudo guardar. Verifica los datos y que el servicio esté activo.');
      },
    });
  }
}
