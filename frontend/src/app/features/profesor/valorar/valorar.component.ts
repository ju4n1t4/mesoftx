import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { Student, MyAssessment, Performance, Level, Rubric } from '../../../core/models/abet.models';

interface IndicatorRow {
  performance: Performance;
  levels: Level[];            // ordenados por rank asc
  alreadyRated: boolean;
}

@Component({
  selector: 'app-valorar',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, SelectButtonModule, TagModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Valorar (rúbrica)</h1>
        <p>Registra las valoraciones de tus estudiantes en los Student Outcomes abiertos.</p>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <!-- Paso 1: qué valorar -->
      <ng-container *ngIf="!loading()">
        <div class="step" *ngIf="!assessment()">
          <div class="step-title">1 · ¿Qué vas a valorar?</div>
          <div class="empty-box" *ngIf="assessments().length === 0">
            No tienes valoraciones pendientes. El coordinador aún no ha abierto ningún student outcome para tus cursos.
          </div>
          <div class="cards" *ngIf="assessments().length > 0">
            <button class="ass-card" *ngFor="let a of assessments()" (click)="pickAssessment(a)">
              <span class="ac-so">{{ a.so_id }}</span>
              <span class="ac-desc">{{ a.description }}</span>
              <span class="ac-nrc">NRC {{ a.nrc }}</span>
            </button>
          </div>
        </div>

        <!-- Paso 2: a quién -->
        <div class="step" *ngIf="assessment() && !student()">
          <div class="step-title">2 · ¿A quién?
            <button pButton type="button" label="Cambiar SO" icon="pi pi-arrow-left" class="p-button-text p-button-sm" (click)="reset()"></button>
          </div>
          <div class="ctx">{{ assessment()!.so_id }} · NRC {{ assessment()!.nrc }}</div>
          <p-table [value]="students()" styleClass="p-datatable-sm" [rowHover]="true">
            <ng-template pTemplate="header"><tr><th>Documento</th><th>Nombre</th><th style="width:8rem"></th></tr></ng-template>
            <ng-template pTemplate="body" let-s>
              <tr>
                <td>{{ s.document_number }}</td>
                <td>{{ s.name }}</td>
                <td><button pButton type="button" label="Valorar" class="p-button-sm" (click)="pickStudent(s)"></button></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="empty-cell">No hay estudiantes matriculados en este curso.</td></tr></ng-template>
          </p-table>
        </div>

        <!-- Paso 3: la rúbrica -->
        <div class="step" *ngIf="assessment() && student()">
          <div class="step-title">3 · Rúbrica
            <button pButton type="button" label="Cambiar estudiante" icon="pi pi-arrow-left" class="p-button-text p-button-sm" (click)="backToStudents()"></button>
          </div>
          <div class="ctx">{{ assessment()!.so_id }} · NRC {{ assessment()!.nrc }} · {{ student()!.name }}</div>

          <div class="indicator" *ngFor="let ind of indicators(); let i = index">
            <div class="ind-head">
              <span class="ind-id">{{ ind.performance.id }}</span>
              <span class="ind-desc">{{ ind.performance.description }}</span>
              <p-tag *ngIf="ind.alreadyRated" severity="success" value="Ya valorado"></p-tag>
            </div>
            <p-selectButton [options]="levelOptions(ind)" [formControl]="levelControl(i)"
                            optionLabel="label" optionValue="value" [allowEmpty]="true">
            </p-selectButton>
          </div>

          <div class="save-bar">
            <button pButton type="button" [label]="saving() ? 'Guardando…' : 'Guardar valoración'"
                    icon="pi pi-save" [disabled]="!canSave() || saving()" (click)="save()"></button>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .step { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; margin-bottom: 16px; }
    .step-title { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
    .ctx { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
    .empty-box { color: var(--text-muted); font-size: 14px; padding: 20px; background: var(--surface-2); border-radius: var(--radius-sm); }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .ass-card { display: flex; flex-direction: column; gap: 4px; text-align: left; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; cursor: pointer; font-family: inherit; }
    .ass-card:hover { border-color: var(--primary); }
    .ac-so { font-weight: 800; color: var(--accent); }
    .ac-desc { font-size: 13px; color: var(--text); }
    .ac-nrc { font-size: 12px; color: var(--text-muted); }
    .indicator { padding: 14px 0; border-bottom: 1px solid var(--border); }
    .ind-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .ind-id { font-weight: 700; color: var(--accent); background: rgba(124,58,237,0.08); padding: 2px 8px; border-radius: 4px; }
    .ind-desc { font-size: 13px; color: var(--text); }
    .save-bar { margin-top: 16px; display: flex; justify-content: flex-end; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
  `],
})
export class ValorarComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);

  assessments = signal<MyAssessment[]>([]);
  private assessmentSig = signal<MyAssessment | null>(null);
  students = signal<Student[]>([]);
  private studentSig = signal<Student | null>(null);
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
    private messageService: MessageService,
  ) {}

  ngOnInit(): void { this.loadAssessments(); }

  private loadAssessments(): void {
    this.loading.set(true);
    this.assesment.getMyAssessments().subscribe({
      next: a => { this.assessments.set(a ?? []); this.loading.set(false); },
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

  pickAssessment(a: MyAssessment): void {
    this.assessmentSig.set(a);
    this.userApi.getSubjectStudents(a.nrc).subscribe({
      next: s => this.students.set(s ?? []),
      error: e => this.showError(e),
    });
  }

  pickStudent(s: Student): void {
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

  levelOptions(ind: IndicatorRow): { label: string; value: string }[] {
    return ind.levels.map(l => ({ label: `${l.rank}. ${l.description}`, value: l.id }));
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
      // Guardado parcial: refrescamos el estado real desde el backend.
      this.pickStudent(s);
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
