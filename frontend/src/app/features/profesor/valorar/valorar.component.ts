import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student, MyAssessment, Performance, Level, Subject } from '../../../core/models/abet.models';

interface IndicatorRow {
  performance: Performance;
  levels: Level[];            // ordenados por rank asc
  alreadyRated: boolean;
}

interface StudentEvalRow extends Student {
  evaluated: boolean;
}

@Component({
  selector: 'app-valorar',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, TagModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Valorar rúbrica</h1>
        <p>Registra las valoraciones de tus estudiantes en los Student Outcomes abiertos.</p>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <ng-container *ngIf="!loading()">
        <div class="valuation-grid" *ngIf="!student()">
          <section class="step">
            <div class="step-title">Seleccione el SO a evaluar.</div>
            <div class="empty-box" *ngIf="assessments().length === 0">
              No tienes valoraciones pendientes. El coordinador aún no ha abierto ningún Student Outcome para tus cursos.
            </div>
            <div class="cards" *ngIf="assessments().length > 0">
              <button class="ass-card" *ngFor="let a of assessments()"
                      [class.selected]="assessment()?.schedule_id === a.schedule_id && assessment()?.nrc === a.nrc"
                      (click)="pickAssessment(a)">
                <span class="ac-so">{{ a.so_id }}</span>
                <span class="ac-desc">{{ a.description }}</span>
                <span class="ac-nrc">NRC {{ a.nrc }}</span>
              </button>
            </div>
          </section>

          <section class="step" *ngIf="assessment()">
            <div class="step-title">Estudiantes a evaluar</div>
            <div class="ctx">{{ assessment()!.so_id }} · NRC {{ assessment()!.nrc }}</div>
            <p-table [value]="students()" styleClass="p-datatable-sm" [rowHover]="true">
              <ng-template pTemplate="header">
                <tr><th>Documento</th><th>Nombre</th><th>Estado</th><th style="width:8rem"></th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-s>
                <tr>
                  <td>{{ s.document_number }}</td>
                  <td>{{ s.name }}</td>
                  <td>
                    <p-tag [severity]="s.evaluated ? 'success' : 'warn'" [value]="s.evaluated ? 'Evaluado' : 'Pendiente'"></p-tag>
                  </td>
                  <td><button pButton type="button" [label]="s.evaluated ? 'Ver' : 'Valorar'" class="p-button-sm" (click)="pickStudent(s)"></button></td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="empty-cell">No hay estudiantes matriculados en este curso.</td></tr></ng-template>
            </p-table>
          </section>

          <section class="step placeholder-step" *ngIf="!assessment() && assessments().length > 0">
            <div class="step-title">Estudiantes a evaluar</div>
            <div class="empty-box">Selecciona un Student Outcome para ver sus estudiantes.</div>
          </section>
        </div>
        <!-- Paso 3: la rúbrica -->
        <div class="rubric-workspace" *ngIf="assessment() && student()">
          <div class="step-title compact">
            Evaluación Individual por Estudiante
            <button pButton type="button" label="Cambiar estudiante" icon="pi pi-arrow-left" class="p-button-text p-button-sm" (click)="backToStudents()"></button>
          </div>

          <section class="info-card so-card">
            <div>
              <span class="eyebrow">Student Outcome</span>
              <h2>{{ assessment()!.so_id }}</h2>
              <p>{{ assessment()!.description }}</p>
            </div>
          </section>

          <div class="meta-grid">
            <section class="info-card">
              <span class="eyebrow">Estudiante</span>
              <div class="kv"><span>Nombre</span><strong>{{ student()!.name }}</strong></div>
              <div class="kv"><span>Documento</span><strong>{{ student()!.document_number }}</strong></div>
              <div class="kv"><span>Programa</span><strong>{{ student()!.program_id || 'Sin programa' }}</strong></div>
            </section>

            <section class="info-card">
              <span class="eyebrow">Contexto académico</span>
              <div class="kv"><span>Periodo</span><strong>{{ periodLabel() }}</strong></div>
              <div class="kv"><span>Materia</span><strong>{{ subjectLabel() }}</strong></div>
              <div class="kv"><span>NRC</span><strong>{{ assessment()!.nrc }}</strong></div>
              <div class="kv"><span>Profesor</span><strong>{{ professorName() }}</strong></div>
              <div class="kv"><span>Programa</span><strong>{{ subjectProgram() }}</strong></div>
            </section>
          </div>

          <section class="rubric-card">
            <div class="rubric-head">
              <div>
                <span class="eyebrow">Evaluación</span>
                <h2>Identificadores de desempeño</h2>
              </div>
              <button pButton type="button" [label]="saving() ? 'Guardando...' : 'Guardar valoración'"
                      icon="pi pi-save" [disabled]="!canSave() || saving()" (click)="save()"></button>
            </div>

            <div class="empty-box" *ngIf="indicators().length === 0">
              No hay identificadores de desempeño configurados para este Student Outcome.
            </div>

            <div class="rubric-list" *ngIf="indicators().length > 0">
              <div class="rubric-row" *ngFor="let ind of indicators(); let i = index">
                <div class="performance-cell">
                  <div class="ind-head">
                    <span class="ind-id">{{ ind.performance.id }}</span>
                    <p-tag *ngIf="ind.alreadyRated" severity="success" value="Ya valorado"></p-tag>
                  </div>
                  <p>{{ ind.performance.description }}</p>
                </div>

                <div class="level-grid" role="radiogroup" [attr.aria-label]="'Categorías de ' + ind.performance.id">
                  <button type="button" class="level-card"
                          *ngFor="let level of ind.levels"
                          [class.selected]="levelControl(i).value === level.id"
                          [disabled]="ind.alreadyRated"
                          (click)="chooseLevel(i, level.id)">
                    <span class="level-name">{{ levelName(level.rank) }}</span>
                    <span class="level-desc">{{ level.description }}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .step { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; margin-bottom: 16px; }
    .step-title { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
    .step-title.compact { margin-bottom: 14px; }
    .ctx { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
    .empty-box { color: var(--text-muted); font-size: 14px; padding: 20px; background: var(--surface-2); border-radius: var(--radius-sm); }
    .valuation-grid { display: grid; grid-template-columns: minmax(280px, 420px) minmax(0, 1fr); gap: 16px; align-items: start; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .ass-card { display: flex; flex-direction: column; gap: 4px; text-align: left; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; cursor: pointer; font-family: inherit; }
    .ass-card:hover { border-color: var(--primary); }
    .ass-card.selected { border-color: var(--primary); background: rgba(16, 185, 129, .08); box-shadow: inset 0 0 0 1px var(--primary); }
    .ac-so { font-weight: 800; color: var(--accent); }
    .ac-desc { font-size: 13px; color: var(--text); }
    .ac-nrc { font-size: 12px; color: var(--text-muted); }
    .rubric-workspace { margin-bottom: 16px; }
    .info-card, .rubric-card { width: 100%; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; margin-bottom: 16px; }
    .eyebrow { display: block; margin-bottom: 8px; color: var(--text-muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
    .so-card h2, .rubric-head h2 { margin: 0 0 6px; color: var(--text); font-size: 18px; line-height: 1.2; }
    .so-card p { margin: 0; color: var(--text); line-height: 1.5; }
    .meta-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
    .kv { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .kv:last-child { border-bottom: 0; }
    .kv span { color: var(--text-muted); }
    .kv strong { color: var(--text); font-weight: 700; overflow-wrap: anywhere; }
    .rubric-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
    .rubric-list { display: flex; flex-direction: column; gap: 14px; }
    .rubric-row { display: grid; grid-template-columns: minmax(220px, 320px) minmax(0, 1fr); gap: 14px; padding: 14px 0; border-top: 1px solid var(--border); }
    .performance-cell p { margin: 8px 0 0; color: var(--text); font-size: 13px; line-height: 1.45; }
    .ind-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .ind-id { font-weight: 700; color: var(--accent); background: rgba(124,58,237,0.08); padding: 2px 8px; border-radius: 4px; }
    .ind-desc { font-size: 13px; color: var(--text); }
    .level-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .level-card { min-height: 132px; display: flex; flex-direction: column; gap: 8px; text-align: left; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; color: var(--text); font: inherit; cursor: pointer; transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
    .level-card:hover:not(:disabled) { border-color: var(--primary); box-shadow: 0 4px 14px rgba(15, 23, 42, .08); }
    .level-card.selected { border-color: var(--primary); background: rgba(16, 185, 129, .08); box-shadow: inset 0 0 0 1px var(--primary); }
    .level-card:disabled { cursor: default; opacity: .78; }
    .level-name { color: var(--text); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .level-desc { color: var(--text-muted); font-size: 12px; line-height: 1.4; }
    .save-bar { margin-top: 16px; display: flex; justify-content: flex-end; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
    @media (max-width: 1100px) {
      .rubric-row { grid-template-columns: 1fr; }
      .level-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 760px) {
      .valuation-grid, .meta-grid, .level-grid { grid-template-columns: 1fr; }
      .rubric-head { align-items: flex-start; flex-direction: column; }
      .kv { grid-template-columns: 1fr; gap: 2px; }
    }
  `],
})
export class ValorarComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);

  assessments = signal<MyAssessment[]>([]);
  private mySubjects = signal<Subject[]>([]);
  private assessmentSig = signal<MyAssessment | null>(null);
  students = signal<StudentEvalRow[]>([]);
  private studentSig = signal<StudentEvalRow | null>(null);
  indicators = signal<IndicatorRow[]>([]);
  // Un control por indicador (mismo orden que indicators()); Reactive, sin ngModel.
  levelsForm = new FormArray<FormControl<string | null>>([]);
  private canSaveSig = signal(false);

  assessment = computed(() => this.assessmentSig());
  student = computed(() => this.studentSig());
  canSave = computed(() => this.canSaveSig());

  levelControl(i: number): FormControl<string | null> {
    return this.levelsForm.at(i) as FormControl<string | null>;
  }

  constructor(
    private userApi: UserApiService,
    private assesment: AssesmentApiService,
    private auth: AuthService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void { this.loadAssessments(); }

  private loadAssessments(): void {
    this.loading.set(true);
    forkJoin({
      assessments: this.assesment.getMyAssessments(),
      subjects: this.userApi.getMySubjects(),
    }).subscribe({
      next: ({ assessments, subjects }) => {
        this.assessments.set(assessments ?? []);
        this.mySubjects.set(subjects ?? []);
        this.loading.set(false);
      },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  reset(): void { this.assessmentSig.set(null); this.studentSig.set(null); this.students.set([]); this.indicators.set([]); this.clearForm(); }
  backToStudents(): void { this.studentSig.set(null); this.indicators.set([]); this.clearForm(); }

  private clearForm(): void { this.levelsForm.clear(); this.canSaveSig.set(false); }

  private recomputeCanSave(): void {
    const inds = this.indicators();
    this.canSaveSig.set(inds.some((ind, i) => !ind.alreadyRated && this.levelsForm.at(i)?.value != null));
  }

  subjectInfo(): Subject | null {
    const a = this.assessmentSig();
    return a ? this.mySubjects().find(s => s.nrc === a.nrc) ?? null : null;
  }

  subjectLabel(): string {
    const s = this.subjectInfo();
    return s ? `${s.materia_curso} · ${s.name}` : `NRC ${this.assessmentSig()?.nrc ?? '-'}`;
  }

  subjectProgram(): string {
    return this.subjectInfo()?.program_id ?? this.studentSig()?.program_id ?? '-';
  }

  periodLabel(): string {
    const period = this.assessmentSig()?.period_id;
    return period != null ? `Periodo ${period}` : '-';
  }

  professorName(): string {
    return this.auth.user()?.name?.trim() || 'Profesor';
  }

  levelName(rank: number): string {
    return rank === 1 ? 'Insatisfactorio'
      : rank === 2 ? 'En desarrollo'
      : rank === 3 ? 'Bueno'
      : rank === 4 ? 'Supera las expectativas'
      : `Nivel ${rank}`;
  }

  chooseLevel(index: number, levelId: string): void {
    const row = this.indicators()[index];
    if (row?.alreadyRated) return;
    this.levelControl(index).setValue(levelId);
    this.recomputeCanSave();
  }

  pickAssessment(a: MyAssessment): void {
    this.assessmentSig.set(a);
    this.studentSig.set(null);
    this.indicators.set([]);
    this.clearForm();
    this.reloadAssessmentStudents(a);
  }

  private reloadAssessmentStudents(a: MyAssessment): void {
    forkJoin({
      students: this.userApi.getSubjectStudents(a.nrc),
      performances: this.assesment.getPerformances(a.so_id),
      rubrics: this.assesment.getRubrics({ schedule_id: a.schedule_id }),
    }).subscribe({
      next: ({ students, performances, rubrics }) => {
        const performanceTotal = (performances ?? []).length;
        const studentPerformanceIds = new Map<number, Set<string>>();
        for (const rubric of rubrics ?? []) {
          if (!studentPerformanceIds.has(rubric.student_id)) studentPerformanceIds.set(rubric.student_id, new Set<string>());
          studentPerformanceIds.get(rubric.student_id)!.add(rubric.performance_id);
        }
        const rows = (students ?? []).map(s => ({
          ...s,
          evaluated: performanceTotal > 0 && (studentPerformanceIds.get(s.id)?.size ?? 0) >= performanceTotal,
        }));
        rows.sort((aRow, bRow) => {
          if (aRow.evaluated !== bRow.evaluated) return aRow.evaluated ? 1 : -1;
          return aRow.name.localeCompare(bRow.name, 'es', { sensitivity: 'base' });
        });
        this.students.set(rows);
      },
      error: e => this.showError(e),
    });
  }

  pickStudent(s: StudentEvalRow): void {
    this.studentSig.set(s);
    const a = this.assessmentSig();
    if (!a) return;
    // Indicadores del SO + niveles (ordenados por rank) + rúbricas ya hechas.
    forkJoin({
      performances: this.assesment.getPerformances(a.so_id),
      rubrics: this.assesment.getRubrics({ schedule_id: a.schedule_id }),
    }).subscribe({
      next: ({ performances, rubrics }) => {
        const mine = (rubrics ?? []).filter(r => r.student_id === s.id);
        const perfs = performances ?? [];
        if (perfs.length === 0) { this.indicators.set([]); return; }
        forkJoin(perfs.map(p => this.assesment.getLevels(p.id))).subscribe({
          next: levelLists => {
            const rows: IndicatorRow[] = perfs.map((p, i) => ({
              performance: p,
              levels: [...(levelLists[i] ?? [])].sort((x, y) => x.rank - y.rank),
              alreadyRated: !!mine.find(r => r.performance_id === p.id),
            }));
            // Reconstruye el FormArray: un control por indicador, precargando el nivel ya valorado.
            this.levelsForm.clear();
            rows.forEach((row) => {
              const existing = mine.find(r => r.performance_id === row.performance.id);
              this.levelsForm.push(new FormControl<string | null>(existing?.level_id ?? null));
            });
            this.levelsForm.valueChanges.subscribe(() => this.recomputeCanSave());
            this.indicators.set(rows);
            this.recomputeCanSave();
          },
          error: e => this.showError(e),
        });
      },
      error: e => this.showError(e),
    });
  }

  save(): void {
    const a = this.assessmentSig(); const s = this.studentSig();
    if (!a || !s) return;
    // Un POST por indicador con nivel elegido que aún no esté valorado.
    const toSave = this.indicators()
      .map((ind, i) => ({ ind, levelId: this.levelsForm.at(i)?.value ?? null }))
      .filter(x => x.levelId != null && !x.ind.alreadyRated);
    if (toSave.length === 0) return;
    this.saving.set(true);

    const results: { id: string; ok: boolean; detail?: string }[] = [];
    let pending = toSave.length;
    const finish = () => {
      if (--pending > 0) return;
      this.saving.set(false);
      const okIds = results.filter(r => r.ok).map(r => r.id);
      const failed = results.filter(r => !r.ok);
      if (okIds.length > 0) this.messageService.add({ severity: 'success', summary: 'Guardado', detail: `Indicadores guardados: ${okIds.join(', ')}` });
      for (const f of failed) this.messageService.add({ severity: 'error', summary: `No se guardó ${f.id}`, detail: f.detail ?? 'Error' });
      // Regresa a la vista de estudiantes a evaluar y actualiza sus estados.
      this.backToStudents();
      this.reloadAssessmentStudents(a);
    };

    for (const { ind, levelId } of toSave) {
      this.assesment.createRubric({
        schedule_id: a.schedule_id,
        student_id: s.id,
        subjects_id: a.nrc,
        performance_id: ind.performance.id,
        level_id: levelId as string,
      }).subscribe({
        next: () => { results.push({ id: ind.performance.id, ok: true }); finish(); },
        error: (e: HttpErrorResponse) => {
          const detail = typeof e.error?.detail === 'string' ? e.error.detail : `Error ${e.status}`;
          results.push({ id: ind.performance.id, ok: false, detail });
          // Si el periodo se cerró mientras valoraba, recargar lo que toca.
          if (e.status === 409 && detail.includes('cerrado')) this.loadAssessments();
          finish();
        },
      });
    }
  }

  private showError(err: HttpErrorResponse): void {
    let detail: string;
    if (err.status === 503) detail = 'Servicio no disponible, intenta en unos segundos';
    else if (err.status === 404) detail = 'No encontrado';
    else detail = typeof err.error?.detail === 'string' ? err.error.detail : 'Ocurrió un error inesperado';
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }
}
