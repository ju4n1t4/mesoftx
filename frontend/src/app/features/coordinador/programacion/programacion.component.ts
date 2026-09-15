import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import {
  Period, Subject, StudentOutcome, SoSchedule, ScheduleStatus,
} from '../../../core/models/abet.models';

/** Fila de la tabla: la programación + el número de NRC asignados. */
interface ScheduleRow extends SoSchedule {
  nrcCount: number;
}

@Component({
  selector: 'app-programacion',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, SelectModule, MultiSelectModule,
    TagModule, ToastModule, ProgressSpinnerModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="content-area">
      <div class="page-header">
        <h1>Programación de Student Outcomes</h1>
        <p>Define qué SO se valoran en cada periodo, qué NRC los miden, y abre o cierra la valoración.</p>
      </div>

      <div class="toolbar">
        <p-select appendTo="body" [options]="periodOptions()" [formControl]="periodCtrl"
                  optionLabel="label" optionValue="value"
                  placeholder="Selecciona un periodo" styleClass="filter-select"></p-select>
        <button pButton type="button" label="Programar SO" icon="pi pi-plus"
                [disabled]="periodCtrl.value == null" (click)="openProgram()"></button>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <div class="hint" *ngIf="!loading() && periodCtrl.value == null">
        Selecciona un periodo para ver o crear su programación.
      </div>

      <p-table *ngIf="!loading() && periodCtrl.value != null" [value]="rows()" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header">
          <tr><th>SO</th><th>Descripción</th><th>Estado</th><th>NRC asignados</th><th style="width:26rem">Acciones</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>{{ r.so_id }}</td>
            <td>{{ soDescription(r.so_id) }}</td>
            <td><p-tag [value]="statusLabel(r.status)" [severity]="statusSeverity(r.status)"></p-tag></td>
            <td>{{ r.nrcCount }}</td>
            <td class="actions">
              <!-- PLANIFICADO -->
              <ng-container *ngIf="r.status === 'PLANIFICADO'">
                <button pButton type="button" label="Abrir valoración" icon="pi pi-play" class="p-button-sm"
                        [disabled]="busy()" (click)="changeStatus(r, 'EN_CURSO')"></button>
                <button pButton type="button" label="Asignar NRC" icon="pi pi-sitemap" class="p-button-sm p-button-secondary"
                        [disabled]="busy()" (click)="openNrc(r)"></button>
                <button pButton type="button" icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger"
                        [disabled]="busy()" (click)="confirmDelete(r)"></button>
              </ng-container>
              <!-- EN_CURSO -->
              <ng-container *ngIf="r.status === 'EN_CURSO'">
                <button pButton type="button" label="Cerrar periodo" icon="pi pi-lock" class="p-button-sm"
                        [disabled]="busy()" (click)="confirmClose(r)"></button>
                <button pButton type="button" label="Asignar NRC" icon="pi pi-sitemap" class="p-button-sm p-button-secondary"
                        [disabled]="busy()" (click)="openNrc(r)"></button>
                <button pButton type="button" label="Volver a planificado" class="p-button-sm p-button-text"
                        [disabled]="busy()" (click)="changeStatus(r, 'PLANIFICADO')"></button>
              </ng-container>
              <!-- CERRADO: sin editar NRC ni borrar -->
              <ng-container *ngIf="r.status === 'CERRADO'">
                <button pButton type="button" label="Reabrir" icon="pi pi-lock-open" class="p-button-sm p-button-secondary"
                        [disabled]="busy()" (click)="confirmReopen(r)"></button>
              </ng-container>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="empty-cell">No hay SO programados en este periodo. Usa "Programar SO".</td></tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Diálogo: programar SO -->
    <p-dialog [(visible)]="programVisible" [modal]="true" [style]="{ width: '440px' }" header="Programar Student Outcome">
      <div class="dialog-form">
        <label>Student Outcome
          <p-select appendTo="body" [options]="soOptions()" [formControl]="soCtrl" optionLabel="label" optionValue="value" placeholder="Selecciona un SO"></p-select>
        </label>
      </div>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="programVisible = false"></button>
        <button pButton type="button" label="Programar" [disabled]="soCtrl.value == null || busy()" (click)="createSchedule()"></button>
      </ng-template>
    </p-dialog>

    <!-- Diálogo: NRC del SO programado -->
    <p-dialog [(visible)]="nrcVisible" [modal]="true" [style]="{ width: '520px' }" header="Materias (NRC) que valoran este SO">
      <div class="dialog-form">
        <label>Materias del periodo
          <p-multiSelect appendTo="body" [options]="periodSubjectOptions()" [formControl]="nrcCtrl"
                         optionLabel="label" optionValue="value" display="chip"
                         placeholder="Selecciona los NRC"></p-multiSelect>
        </label>
        <small class="muted" *ngIf="periodSubjectOptions().length === 0">
          No hay materias registradas para el periodo seleccionado. Crea las materias desde el menú Materias.
        </small>
        <small class="muted">La lista completa reemplaza la asignación anterior.</small>
      </div>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="nrcVisible = false"></button>
        <button pButton type="button" label="Guardar" [disabled]="busy()" (click)="saveNrc()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .hint { color: var(--text-muted); font-size: 14px; padding: 24px; background: #fff; border: 1px dashed var(--border); border-radius: var(--radius-md); }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .dialog-form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .muted { color: var(--text-muted); font-weight: 400; }
  `],
})
export class ProgramacionComponent implements OnInit {
  loading = signal(true);
  busy = signal(false);
  programVisible = false;
  nrcVisible = false;

  periodCtrl = new FormControl<number | null>(null);
  soCtrl = new FormControl<string | null>(null);
  nrcCtrl = new FormControl<number[]>([], { nonNullable: true });

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
    this.periodCtrl.valueChanges.subscribe(() => this.reloadSchedules());
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
