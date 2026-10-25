import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
﻿import { Component, OnInit, computed, signal } from '@angular/core';
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

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import { AuthService } from '../../../../../auth/application/services/auth.service';
import { Student, MyAssessment, Performance, Level, Subject } from '../../../../domain/models/abet.models';

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
  imports: [ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, TagModule, ToastModule, ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './valorar.component.html',
  styleUrl: './valorar.component.scss',
})
export class ValorarComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);

  assessments = signal<MyAssessment[]>([]);
  private mySubjects = signal<Subject[]>([]);
  selectedNrc = signal<number | null>(null);
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
  nrcOptions = computed(() => {
    const openNrcs = new Set(this.assessments().map(a => a.nrc));
    return this.mySubjects()
      .filter(s => openNrcs.has(s.nrc))
      .sort((a, b) => String(a.materia_curso).localeCompare(String(b.materia_curso), 'es', { sensitivity: 'base' }));
  });
  assessmentsForSelectedNrc = computed(() => {
    const nrc = this.selectedNrc();
    return nrc == null ? [] : this.assessments().filter(a => a.nrc === nrc);
  });

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
        const firstNrc = this.nrcOptions()[0]?.nrc ?? (assessments ?? [])[0]?.nrc ?? null;
        this.selectedNrc.set(firstNrc);
        this.loading.set(false);
      },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  reset(): void { this.assessmentSig.set(null); this.studentSig.set(null); this.students.set([]); this.indicators.set([]); this.clearForm(); }
  backToStudents(): void { this.studentSig.set(null); this.indicators.set([]); this.clearForm(); }

  pickNrc(nrc: number): void {
    if (this.selectedNrc() === nrc) return;
    this.selectedNrc.set(nrc);
    this.reset();
  }

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

  performanceCode(performance: Performance): string {
    return performance.code || performance.id;
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
      rubrics: this.assesment.getRubrics({ schedule_id: a.schedule_id, subjects_id: a.nrc }),
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
      rubrics: this.assesment.getRubrics({ schedule_id: a.schedule_id, subjects_id: a.nrc }),
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
