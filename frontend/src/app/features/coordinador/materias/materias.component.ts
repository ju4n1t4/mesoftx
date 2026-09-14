import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { Subject, Period, Program } from '../../../core/models/abet.models';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="content-area">
      <div class="page-header">
        <h1>Materias (NRC)</h1>
        <p>Gestiona las materias del programa. Cada NRC es una sección única en un periodo.</p>
      </div>

      <div class="toolbar">
        <p-select
          [options]="periodOptions()"
          [formControl]="periodFilter"
          optionLabel="label" optionValue="value"
          placeholder="Todos los periodos"
          [showClear]="true"
          styleClass="filter-select">
        </p-select>
        <button pButton type="button" label="Nueva materia" icon="pi pi-plus" (click)="openCreate()"></button>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <p-table *ngIf="!loading()" [value]="filtered()" [paginator]="true" [rows]="10"
               styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header">
          <tr>
            <th>NRC</th><th>Código</th><th>Nombre</th><th>Periodo</th><th>Programa</th><th style="width:9rem">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-s>
          <tr>
            <td>{{ s.nrc }}</td>
            <td>{{ s.materia_curso }}</td>
            <td>{{ s.name }}</td>
            <td>{{ periodCode(s.periods_id) }}</td>
            <td>{{ s.program_id }}</td>
            <td>
              <button pButton type="button" icon="pi pi-pencil" class="p-button-text p-button-sm" (click)="openEdit(s)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm" (click)="confirmDelete(s)"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="empty-cell">No hay materias registradas. Crea la primera con "Nueva materia".</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '480px' }"
              [header]="editing() ? 'Editar materia' : 'Nueva materia'" [closable]="true">
      <form [formGroup]="form" class="dialog-form">
        <label>NRC
          <input pInputText type="number" formControlName="nrc" placeholder="Ej. 12345" />
          <small class="err" *ngIf="showErr('nrc')">NRC requerido (entero positivo).</small>
        </label>
        <label>Código institucional (materia_curso)
          <input pInputText formControlName="materia_curso" maxlength="25" placeholder="Ej. ISI-2301" />
          <small class="err" *ngIf="showErr('materia_curso')">Requerido, máx 25 caracteres.</small>
        </label>
        <label>Nombre
          <input pInputText formControlName="name" maxlength="255" placeholder="Ej. Bases de Datos" />
          <small class="err" *ngIf="showErr('name')">Requerido, máx 255 caracteres.</small>
        </label>
        <label>Periodo
          <p-select formControlName="periods_id" [options]="periodOptions()" optionLabel="label" optionValue="value" placeholder="Selecciona un periodo"></p-select>
          <small class="err" *ngIf="showErr('periods_id')">Selecciona un periodo.</small>
        </label>
        <label>Programa
          <p-select formControlName="program_id" [options]="programOptions()" optionLabel="label" optionValue="value" placeholder="Selecciona un programa"></p-select>
          <small class="err" *ngIf="showErr('program_id')">Selecciona un programa.</small>
        </label>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" [label]="saving() ? 'Guardando…' : 'Guardar'" [disabled]="saving()" (click)="save()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .dialog-form input, .dialog-form p-select { width: 100%; }
    .err { color: var(--badge-expired, #dc2626); font-weight: 500; font-size: 12px; }
  `],
})
export class MateriasComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  dialogVisible = false;
  periodFilter = new FormControl<number | null>(null);

  private subjects = signal<Subject[]>([]);
  private periods = signal<Period[]>([]);
  private programs = signal<Program[]>([]);
  private periodFilterValue = signal<number | null>(null);

  form: FormGroup;

  periodOptions = computed(() => this.periods().map(p => ({ label: p.code, value: p.id })));
  programOptions = computed(() => this.programs().map(p => ({ label: `${p.id} · ${p.name}`, value: p.id })));

  filtered = computed(() => {
    const f = this.periodFilterValue();
    return f == null ? this.subjects() : this.subjects().filter(s => s.periods_id === f);
  });

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      nrc: [null as number | null, [Validators.required, Validators.min(1)]],
      materia_curso: ['', [Validators.required, Validators.maxLength(25)]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      periods_id: [null as number | null, [Validators.required]],
      program_id: ['' as string, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.periodFilter.valueChanges.subscribe(v => this.periodFilterValue.set(v ?? null));
    this.userApi.getPeriods().subscribe({ next: p => this.periods.set(p ?? []), error: e => this.showError(e) });
    this.userApi.getPrograms().subscribe({ next: p => this.programs.set(p ?? []), error: e => this.showError(e) });
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.userApi.getSubjects().subscribe({
      next: s => { this.subjects.set(s ?? []); this.loading.set(false); },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  periodCode(id: number): string { return this.periods().find(p => p.id === id)?.code ?? '—'; }

  showErr(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  openCreate(): void {
    this.editing.set(false);
    this.form.reset({ nrc: null, materia_curso: '', name: '', periods_id: null, program_id: '' });
    this.form.get('nrc')?.enable();
    this.dialogVisible = true;
  }

  openEdit(s: Subject): void {
    this.editing.set(true);
    this.form.reset({ nrc: s.nrc, materia_curso: s.materia_curso, name: s.name, periods_id: s.periods_id, program_id: s.program_id });
    this.form.get('nrc')?.disable();   // el NRC es la PK: no editable
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Subject = {
      nrc: Number(raw.nrc),
      materia_curso: raw.materia_curso as string,
      name: raw.name as string,
      periods_id: Number(raw.periods_id),
      program_id: raw.program_id as string,
    };

    const done = () => { this.saving.set(false); this.dialogVisible = false; this.reload(); };
    if (this.editing()) {
      const { nrc, ...patch } = body;
      this.userApi.updateSubject(nrc, patch).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Materia actualizada.' }); done(); },
        error: e => { this.saving.set(false); this.showError(e); },
      });
    } else {
      this.userApi.createSubject(body).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Creada', detail: 'Materia creada.' }); done(); },
        error: e => { this.saving.set(false); this.showError(e); },
      });
    }
  }

  confirmDelete(s: Subject): void {
    this.confirmationService.confirm({
      header: 'Borrar materia',
      message: `¿Borrar la materia ${s.materia_curso} (NRC ${s.nrc})? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Borrar', rejectLabel: 'Cancelar',
      accept: () => this.doDelete(s),
    });
  }

  private doDelete(s: Subject): void {
    this.userApi.deleteSubject(s.nrc).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Borrada', detail: `Materia ${s.materia_curso} borrada.` });
        this.reload();
      },
      // 409 (rúbricas en periodo cerrado) o 503: se muestra el detail y NO se quita la fila.
      error: e => this.showError(e),
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
