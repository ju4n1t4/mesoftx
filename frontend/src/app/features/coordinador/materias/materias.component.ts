import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
import { BulkExcelService, BulkImportSummary } from '../../../shared/bulk-import/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../shared/bulk-import/bulk-result-dialog.component';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule, BulkResultDialogComponent,
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
        <p-select appendTo="body"
          [options]="periodOptions()"
          [formControl]="periodFilter"
          optionLabel="label" optionValue="value"
          placeholder="Todos los periodos"
          [showClear]="true"
          styleClass="filter-select">
        </p-select>
        <span class="toolbar-spacer"></span>
        <button pButton type="button" label="Descargar plantilla" icon="pi pi-download" class="p-button-secondary" (click)="downloadTemplate()"></button>
        <button pButton type="button" label="Cargar Excel" icon="pi pi-upload" class="p-button-secondary" (click)="bulkInput.click()" [disabled]="periods().length === 0 || programs().length === 0"></button>
        <input #bulkInput type="file" accept=".xlsx" hidden (change)="onBulkFile($event)" />
        <button pButton type="button" label="Nueva materia" icon="pi pi-plus" (click)="openCreate()" [disabled]="periods().length === 0 || programs().length === 0"></button>
      </div>

      <div class="notice" *ngIf="!loading() && periods().length === 0">
        <i class="pi pi-info-circle"></i>
        <span>No hay periodos registrados. Crea un periodo antes de registrar materias.</span>
      </div>

      <div class="notice" *ngIf="!loading() && programs().length === 0">
        <i class="pi pi-info-circle"></i>
        <span>No hay programas activos registrados. Crea y activa un programa antes de registrar materias.</span>
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
          <small class="err" *ngIf="showErr('materia_curso')">Requerido, máximo 25 caracteres.</small>
        </label>
        <label>Nombre
          <input pInputText formControlName="name" maxlength="255" placeholder="Ej. Bases de Datos" />
          <small class="err" *ngIf="showErr('name')">Requerido, máximo 255 caracteres.</small>
        </label>
        <label>Periodo
          <p-select appendTo="body" formControlName="periods_id" [options]="periodOptions()" optionLabel="label" optionValue="value" placeholder="Selecciona un periodo"></p-select>
          <small class="err" *ngIf="showErr('periods_id')">Selecciona un periodo.</small>
        </label>
        <label>Programa
          <p-select appendTo="body" formControlName="program_id" [options]="programOptions()" optionLabel="label" optionValue="value" placeholder="Selecciona un programa"></p-select>
          <small class="err" *ngIf="showErr('program_id')">Selecciona un programa.</small>
        </label>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" [label]="saving() ? 'Guardando...' : 'Guardar'" [disabled]="saving()" (click)="save()"></button>
      </ng-template>
    </p-dialog>

    <app-bulk-result-dialog
      title="Resultado cargue masivo de materias"
      [(visible)]="bulkVisible"
      [summary]="bulkSummary">
    </app-bulk-result-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .toolbar-spacer { flex: 1 1 auto; }
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }
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
  bulkVisible = false;
  bulkSummary: BulkImportSummary = { success: [], skipped: [], errors: [] };
  periodFilter = new FormControl<number | null>(null);

  private subjects = signal<Subject[]>([]);
  periods = signal<Period[]>([]);
  programs = signal<Program[]>([]);
  private periodFilterValue = signal<number | null>(null);

  form: FormGroup;

  periodOptions = computed(() => this.periods().map(p => ({ label: p.code, value: p.id })));
  programOptions = computed(() => this.programs()
    .filter(p => p.active || p.id === this.form?.getRawValue().program_id)
    .map(p => ({ label: `${p.id} - ${p.name}${p.active ? '' : ' (inactivo)'}`, value: p.id })));

  filtered = computed(() => {
    const f = this.periodFilterValue();
    return f == null ? this.subjects() : this.subjects().filter(s => s.periods_id === f);
  });

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private bulkExcel: BulkExcelService,
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
    this.userApi.getPrograms().subscribe({ next: p => this.programs.set((p ?? []).filter(program => program.active)), error: e => this.showError(e) });
    this.reload();
  }

  downloadTemplate(): void {
    this.bulkExcel.downloadTemplate(
      'plantilla_materias.xlsx',
      ['nrc', 'materia_curso', 'name', 'period_code', 'program_id'],
      'Materias',
    );
  }

  async onBulkFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const summary: BulkImportSummary = { success: [], skipped: [], errors: [] };
    try {
      const rows = await this.bulkExcel.readRows(file);
      const existing = new Set(this.subjects().map(s => s.nrc));
      const periodsByCode = new Map(this.periods().map(p => [p.code, p]));
      const activePrograms = new Map(this.programs().filter(p => p.active).map(p => [p.id.toUpperCase(), p]));
      const seen = new Set<number>();

      for (let index = 0; index < rows.length; index++) {
        const rowNumber = index + 2;
        const nrcText = this.bulkExcel.value(rows[index], 'nrc');
        const nrc = Number(nrcText);
        const materiaCurso = this.bulkExcel.value(rows[index], 'materia_curso');
        const name = this.bulkExcel.value(rows[index], 'name');
        const periodCode = this.bulkExcel.value(rows[index], 'period_code');
        const programId = this.bulkExcel.value(rows[index], 'program_id').toUpperCase();
        const label = nrcText || `Fila ${rowNumber}`;
        const period = periodsByCode.get(periodCode);

        if (!Number.isInteger(nrc) || nrc <= 0) {
          summary.errors.push({ row: rowNumber, label, detail: 'El NRC es requerido y debe ser un entero positivo.' });
          continue;
        }
        if (!materiaCurso || materiaCurso.length > 25) {
          summary.errors.push({ row: rowNumber, label, detail: 'El código institucional es requerido y debe tener máximo 25 caracteres.' });
          continue;
        }
        if (!name || name.length > 255) {
          summary.errors.push({ row: rowNumber, label, detail: 'El nombre es requerido y debe tener máximo 255 caracteres.' });
          continue;
        }
        if (!period) {
          summary.errors.push({ row: rowNumber, label, detail: 'El periodo indicado no existe.' });
          continue;
        }
        if (!activePrograms.has(programId)) {
          summary.errors.push({ row: rowNumber, label, detail: 'El programa indicado no existe o está inactivo.' });
          continue;
        }
        if (existing.has(nrc)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Ya existe una materia con ese NRC.' });
          continue;
        }
        if (seen.has(nrc)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Registro repetido dentro del archivo.' });
          continue;
        }

        seen.add(nrc);
        try {
          await firstValueFrom(this.userApi.createSubject({
            nrc,
            materia_curso: materiaCurso,
            name,
            periods_id: period.id,
            program_id: programId,
          }));
          existing.add(nrc);
          summary.success.push({ row: rowNumber, label: String(nrc), detail: `${materiaCurso} - ${name}` });
        } catch (err) {
          summary.errors.push({ row: rowNumber, label: String(nrc), detail: this.errorText(err) });
        }
      }
    } catch (err) {
      summary.errors.push({ row: 0, label: file.name, detail: this.errorText(err) });
    }

    this.bulkSummary = summary;
    this.bulkVisible = true;
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.userApi.getSubjects().subscribe({
      next: s => { this.subjects.set(s ?? []); this.loading.set(false); },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  periodCode(id: number): string { return this.periods().find(p => p.id === id)?.code ?? '-'; }

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
    this.form.get('nrc')?.disable();
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Subject = {
      nrc: Number(raw.nrc),
      materia_curso: String(raw.materia_curso).trim(),
      name: String(raw.name).trim(),
      periods_id: Number(raw.periods_id),
      program_id: String(raw.program_id).trim().toUpperCase(),
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
      // 409 (rubricas en periodo cerrado) o 503: se muestra el detail y no se quita la fila.
      error: e => this.showError(e),
    });
  }

  private showError(err: HttpErrorResponse): void {
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail: this.errorText(err) });
  }

  private errorText(err: unknown): string {
    const http = err as HttpErrorResponse;
    if (http?.status === 503) return 'Servicio no disponible, intenta en unos segundos';
    if (http?.status === 404) return 'No encontrado';
    return typeof http?.error?.detail === 'string' ? http.error.detail : 'Ocurrió un error inesperado';
  }
}
