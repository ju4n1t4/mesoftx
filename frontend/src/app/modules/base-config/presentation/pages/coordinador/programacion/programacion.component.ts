import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { AssesmentGateway as AssesmentApiService } from '../../../../application/ports/assesment-api.service.port';
import {
  Period, Subject, StudentOutcome, SoSchedule, ScheduleStatus,
} from '../../../../domain/models/abet.models';

/** Fila de la tabla: la programación + el número de NRC asignados. */
interface ScheduleRow extends SoSchedule {
  nrcCount: number;
}

@Component({
  selector: 'app-programacion',
  standalone: true,
  imports: [ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, SelectModule, MultiSelectModule,
    TagModule, ToastModule, ProgressSpinnerModule, ConfirmDialogModule, InputNumberModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './programacion.component.html',
  styleUrl: './programacion.component.scss',
})
export class ProgramacionComponent implements OnInit {
  loading = signal(true);
  busy = signal(false);
  programVisible = false;
  nrcVisible = false;

  periodCtrl = new FormControl<number | null>(null);
  soCtrl = new FormControl<string | null>(null);
  nrcCtrl = new FormControl<number[]>([], { nonNullable: true });
  targetCtrl = new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(100)]);

  targetLoading = signal(false);
  targetSaving = signal(false);
  targetConfigured = signal(false);
  // Valor confirmado por el backend; sirve para restaurar el campo tras un 409.
  private lastSavedTarget = signal<number | null>(null);

  private periods = signal<Period[]>([]);
  private allSubjects = signal<Subject[]>([]);
  private sos = signal<StudentOutcome[]>([]);
  private rowsSig = signal<ScheduleRow[]>([]);
  private nrcTarget = signal<ScheduleRow | null>(null);
  private nrcSubjectOptions = signal<{ label: string; value: number }[]>([]);

  periodOptions = computed(() => this.periods().map(p => ({ label: p.code, value: p.id })));
  soOptions = computed(() => this.sos().map(s => ({ label: `${s.id} · ${s.description}`, value: s.id })));
  rows = computed(() => this.rowsSig());

  // Materias del mismo periodo de la programación abierta en el diálogo NRC.
  periodSubjectOptions = computed(() => this.nrcSubjectOptions());

  constructor(
    private userApi: UserApiService,
    private assesment: AssesmentApiService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.periodCtrl.valueChanges.subscribe(() => { this.reloadSchedules(); this.loadTarget(); });
    forkJoin({
      periods: this.userApi.getPeriods(),
      subjects: this.userApi.getSubjects(),
      sos: this.assesment.getStudentOutcomes(),
    }).subscribe({
      next: ({ periods, subjects, sos }) => {
        this.periods.set(periods ?? []);
        this.allSubjects.set(subjects ?? []);
        this.sos.set(sos ?? []);
        this.loading.set(false);
      },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  soDescription(soId: string): string { return this.sos().find(s => s.id === soId)?.description ?? '—'; }
  statusLabel(s: ScheduleStatus): string {
    return s === 'PLANIFICADO' ? 'Planificado' : s === 'EN_CURSO' ? 'En curso' : 'Cerrado';
  }
  statusSeverity(s: ScheduleStatus): 'info' | 'success' | 'secondary' {
    return s === 'PLANIFICADO' ? 'info' : s === 'EN_CURSO' ? 'success' : 'secondary';
  }

  private reloadSchedules(): void {
    const pid = this.periodCtrl.value;
    if (pid == null) { this.rowsSig.set([]); return; }
    this.assesment.getSoSchedules(pid).subscribe({
      next: schedules => {
        const list = schedules ?? [];
        if (list.length === 0) { this.rowsSig.set([]); return; }
        // Conteo de NRC por programación (una llamada por fila; listas cortas).
        forkJoin(list.map(s => this.assesment.getScheduleSubjects(s.id))).subscribe({
          next: nrcLists => this.rowsSig.set(list.map((s, i) => ({ ...s, nrcCount: (nrcLists[i] ?? []).length }))),
          error: () => this.rowsSig.set(list.map(s => ({ ...s, nrcCount: 0 }))),
        });
      },
      error: e => this.showError(e),
    });
  }

  private loadTarget(): void {
    const pid = this.periodCtrl.value;
    this.targetConfigured.set(false);
    this.lastSavedTarget.set(null);
    this.targetCtrl.setValue(null, { emitEvent: false });
    if (pid == null) return;
    this.targetLoading.set(true);
    this.assesment.getPeriodTarget(pid).subscribe({
      next: t => {
        this.targetCtrl.setValue(t.target_pct, { emitEvent: false });
        this.lastSavedTarget.set(t.target_pct);
        this.targetConfigured.set(true);
        this.targetLoading.set(false);
      },
      // 404 = periodo sin meta: campo vacío y "Sin meta configurada".
      error: e => {
        this.targetLoading.set(false);
        if (e.status !== 404) this.showError(e);
      },
    });
  }

  saveTarget(): void {
    const pid = this.periodCtrl.value;
    const value = this.targetCtrl.value;
    if (pid == null || value == null || this.targetCtrl.invalid) return;
    this.targetSaving.set(true);
    this.assesment.updatePeriodTarget(pid, value).subscribe({
      next: t => {
        this.targetSaving.set(false);
        this.targetCtrl.setValue(t.target_pct, { emitEvent: false });
        this.lastSavedTarget.set(t.target_pct);
        this.targetConfigured.set(true);
        this.messageService.add({ severity: 'success', summary: 'Meta guardada', detail: `Meta de logro: ${t.target_pct} %` });
      },
      // 409 = periodo con cierres: muestra el detail y restaura el valor previo.
      error: e => {
        this.targetSaving.set(false);
        this.targetCtrl.setValue(this.lastSavedTarget(), { emitEvent: false });
        this.showError(e);
      },
    });
  }

  openProgram(): void { this.soCtrl.reset(null); this.programVisible = true; }

  createSchedule(): void {
    const soId = this.soCtrl.value;
    const pid = this.periodCtrl.value;
    if (soId == null || pid == null) return;
    this.busy.set(true);
    this.assesment.createSoSchedule({ so_id: soId, period_id: pid }).subscribe({
      next: () => { this.busy.set(false); this.programVisible = false; this.messageService.add({ severity: 'success', summary: 'Programado', detail: `SO ${soId} programado.` }); this.reloadSchedules(); },
      error: e => { this.busy.set(false); this.showError(e); },
    });
  }

  openNrc(r: ScheduleRow): void {
    this.nrcTarget.set(r);
    this.nrcCtrl.reset([]);
    this.nrcSubjectOptions.set([]);
    this.busy.set(true);
    forkJoin({
      subjects: this.userApi.getSubjects(),
      assigned: this.assesment.getScheduleSubjects(r.id),
    }).subscribe({
      next: ({ subjects, assigned }) => {
        const list = subjects ?? [];
        this.allSubjects.set(list);
        this.nrcSubjectOptions.set(this.subjectOptionsForPeriod(list, r.period_id));
        this.nrcCtrl.setValue(assigned ?? []);
        this.nrcVisible = true;
        this.busy.set(false);
      },
      error: e => { this.busy.set(false); this.showError(e); },
    });
  }

  private subjectOptionsForPeriod(subjects: Subject[], periodId: number): { label: string; value: number }[] {
    const pid = Number(periodId);
    return subjects
      .filter(s => Number(s.periods_id) === pid)
      .map(s => ({ label: `${s.nrc} · ${s.materia_curso} — ${s.name}`, value: s.nrc }));
  }

  saveNrc(): void {
    const r = this.nrcTarget();
    if (!r) return;
    this.busy.set(true);
    this.assesment.setScheduleSubjects(r.id, this.nrcCtrl.value).subscribe({
      next: () => { this.busy.set(false); this.nrcVisible = false; this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'NRC actualizados.' }); this.reloadSchedules(); },
      error: e => { this.busy.set(false); this.showError(e); },   // 422 "no es del periodo" -> detail
    });
  }

  changeStatus(r: ScheduleRow, status: ScheduleStatus): void {
    this.busy.set(true);
    this.assesment.patchScheduleStatus(r.id, status).subscribe({
      next: updated => {
        this.busy.set(false);
        // Recarga con la respuesta del backend (trae updated_by/updated_at).
        this.rowsSig.set(this.rows().map(row => row.id === r.id ? { ...updated, nrcCount: row.nrcCount } : row));
        this.messageService.add({ severity: 'success', summary: 'Estado actualizado', detail: this.statusLabel(updated.status) });
      },
      error: e => { this.busy.set(false); this.showError(e); },   // 409 -> detail (deja el estado como estaba)
    });
  }

  confirmClose(r: ScheduleRow): void {
    this.confirmationService.confirm({
      header: 'Cerrar periodo',
      message: 'Al cerrar, los profesores ya no podrán valorar este SO. ¿Continuar?',
      icon: 'pi pi-exclamation-triangle', acceptLabel: 'Cerrar', rejectLabel: 'Cancelar',
      accept: () => this.changeStatus(r, 'CERRADO'),
    });
  }

  confirmReopen(r: ScheduleRow): void {
    this.confirmationService.confirm({
      header: 'Reabrir periodo',
      message: 'Vas a reabrir un periodo cerrado. Las valoraciones podrán modificarse de nuevo. ¿Continuar?',
      icon: 'pi pi-exclamation-triangle', acceptLabel: 'Reabrir', rejectLabel: 'Cancelar',
      accept: () => this.changeStatus(r, 'EN_CURSO'),
    });
  }

  confirmDelete(r: ScheduleRow): void {
    this.confirmationService.confirm({
      header: 'Borrar programación',
      message: `¿Borrar la programación del SO ${r.so_id}? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle', acceptLabel: 'Borrar', rejectLabel: 'Cancelar',
      accept: () => this.doDelete(r),
    });
  }

  private doDelete(r: ScheduleRow): void {
    this.busy.set(true);
    this.assesment.deleteSoSchedule(r.id).subscribe({
      next: () => { this.busy.set(false); this.messageService.add({ severity: 'success', summary: 'Borrada', detail: 'Programación borrada.' }); this.reloadSchedules(); },
      error: e => { this.busy.set(false); this.showError(e); },
    });
  }

  private showError(err: HttpErrorResponse): void {
    let detail: string;
    if (err.status === 503) detail = 'Servicio no disponible, intenta en unos segundos';
    else if (err.status === 404) detail = 'No encontrado';
    else detail = typeof err.error?.detail === 'string' ? err.error.detail : 'Ocurrió un error inesperado';
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }
}
