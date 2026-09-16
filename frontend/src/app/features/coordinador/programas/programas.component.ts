import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
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
import { Program, College } from '../../../core/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../shared/bulk-import/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../shared/bulk-import/bulk-result-dialog.component';

interface ProgramView extends Program { collegeName: string; }

@Component({
  selector: 'app-programas',
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
        <h1>Programas académicos</h1>
        <p>Gestiona los programas académicos asociados a cada facultad.</p>
      </div>

      <div class="notice" *ngIf="error()">
        <i class="pi pi-info-circle"></i>
        <span>{{ error() }}</span>
      </div>

      <div class="toolbar">
        <button pButton type="button" label="Descargar plantilla" icon="pi pi-download" class="p-button-secondary" (click)="downloadTemplate()"></button>
        <button pButton type="button" label="Cargar Excel" icon="pi pi-upload" class="p-button-secondary" (click)="bulkInput.click()" [disabled]="colleges().length === 0"></button>
        <input #bulkInput type="file" accept=".xlsx" hidden (change)="onBulkFile($event)" />
        <button pButton type="button" label="Nuevo programa" icon="pi pi-plus" (click)="openCreate()" [disabled]="colleges().length === 0"></button>
      </div>

      <div class="notice" *ngIf="!loading() && colleges().length === 0">
        <i class="pi pi-info-circle"></i>
        <span>Crea al menos una facultad antes de registrar programas.</span>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <p-table *ngIf="!loading()" [value]="programs()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header">
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Facultad</th>
            <th>Acreditación</th>
            <th>Estado</th>
            <th style="width:10rem">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td><span class="code">{{ p.id }}</span></td>
            <td>{{ p.name }}</td>
            <td>{{ p.collegeName || p.college_id }}</td>
            <td>
              <span class="badge" [class.on]="p.accredited">{{ p.accredited ? 'Acreditado' : 'En proceso' }}</span>
              <span class="year" *ngIf="p.accredited && p.accreditation_end_year">hasta {{ p.accreditation_end_year }}</span>
            </td>
            <td>
              <button type="button" class="state-switch" [class.is-active]="p.active" (click)="toggleActive(p)" [attr.aria-label]="p.active ? 'Desactivar' : 'Activar'">
                <span></span>
              </button>
            </td>
            <td class="actions">
              <button pButton type="button" icon="pi pi-pencil" class="p-button-sm p-button-text" (click)="openEdit(p)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger" (click)="confirmDelete(p)"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="empty-cell">No hay programas registrados.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }" [header]="editing() ? 'Editar programa' : 'Nuevo programa'">
      <form [formGroup]="form" class="dialog-form">
        <label>Código
          <input pInputText formControlName="id" maxlength="3" placeholder="Ej. ISI" />
          <small class="err" *ngIf="showErr('id')">Código requerido, máximo 3 caracteres.</small>
        </label>
        <label>Nombre
          <input pInputText formControlName="name" maxlength="255" placeholder="Ej. Ingenieria de Sistemas" />
          <small class="err" *ngIf="showErr('name')">Nombre requerido.</small>
        </label>
        <label>Facultad
          <p-select appendTo="body" formControlName="college_id" [options]="collegeOptions()" optionLabel="label" optionValue="value" placeholder="Selecciona una facultad"></p-select>
          <small class="err" *ngIf="showErr('college_id')">Selecciona una facultad.</small>
        </label>
        <label class="check-row">
          <input type="checkbox" formControlName="accredited" />
          <span>Programa acreditado</span>
        </label>
        <label>Año fin de acreditación
          <input pInputText type="number" formControlName="accreditation_end_year" placeholder="Ej. 2030" />
        </label>
        <label class="check-row">
          <input type="checkbox" formControlName="active" />
          <span>Activo</span>
        </label>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" [label]="saving() ? 'Guardando...' : 'Guardar'" [disabled]="saving()" (click)="save()"></button>
      </ng-template>
    </p-dialog>

    <app-bulk-result-dialog
      title="Resultado cargue masivo de programas"
      [(visible)]="bulkVisible"
      [summary]="bulkSummary">
    </app-bulk-result-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .actions { display: flex; gap: 6px; }
    .code { color: var(--accent); font-weight: 700; }
    .badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; color: var(--badge-expired); background: rgba(220,38,38,0.08); }
    .badge.on { color: var(--badge-open); background: rgba(22,163,74,0.1); }
    .year { display: inline-block; margin-left: 8px; color: var(--text-muted); font-size: 12px; }
    .state-switch { border: 0; display: inline-flex; align-items: center; width: 40px; height: 22px; padding: 2px; border-radius: 999px; background: #d1d5db; vertical-align: middle; cursor: pointer; }
    .state-switch span { width: 18px; height: 18px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, .18); transition: transform .18s ease; }
    .state-switch.is-active { background: #10b981; }
    .state-switch.is-active span { transform: translateX(18px); }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .dialog-form input, .dialog-form p-select { width: 100%; }
    .check-row { flex-direction: row !important; align-items: center; gap: 8px !important; }
    .check-row input { width: auto; }
    .err { color: var(--badge-expired, #dc2626); font-size: 12px; }
  `],
})
export class ProgramasComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  dialogVisible = false;
  bulkVisible = false;
  bulkSummary: BulkImportSummary = { success: [], skipped: [], errors: [] };
  error = signal('');
  programs = signal<ProgramView[]>([]);
  colleges = signal<College[]>([]);
  private editId = signal<string | null>(null);

  form: FormGroup;

  collegeOptions = computed(() => this.colleges()
    .filter(c => c.active || c.id === this.form?.getRawValue().college_id)
    .map(c => ({ label: `${c.id} - ${c.name}${c.active ? '' : ' (inactiva)'}`, value: c.id })));

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private bulkExcel: BulkExcelService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      id: ['', [Validators.required, Validators.maxLength(3)]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      college_id: ['', [Validators.required]],
      accredited: [false],
      accreditation_end_year: [null as number | null],
      active: [true],
    });
  }

  ngOnInit(): void {
    this.reload();
  }

  downloadTemplate(): void {
    this.bulkExcel.downloadTemplate(
      'plantilla_programas.xlsx',
      ['id', 'name', 'college_id', 'accredited', 'accreditation_end_year', 'active'],
      'Programas',
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
      const existing = new Set(this.programs().map(p => p.id.toUpperCase()));
      const colleges = new Map(this.colleges().map(c => [c.id.toUpperCase(), c]));
      const seen = new Set<string>();

      for (let index = 0; index < rows.length; index++) {
        const rowNumber = index + 2;
        const id = this.bulkExcel.value(rows[index], 'id').toUpperCase();
        const name = this.bulkExcel.value(rows[index], 'name');
        const collegeId = this.bulkExcel.value(rows[index], 'college_id').toUpperCase();
        const accredited = this.bulkExcel.boolValue(rows[index], 'accredited', false);
        const yearText = this.bulkExcel.value(rows[index], 'accreditation_end_year');
        const active = this.bulkExcel.boolValue(rows[index], 'active', true);
        const label = id || `Fila ${rowNumber}`;
        const year = yearText ? Number(yearText) : null;

        if (!id || id.length > 3) {
          summary.errors.push({ row: rowNumber, label, detail: 'El id es requerido y debe tener máximo 3 caracteres.' });
          continue;
        }
        if (!name || name.length > 255) {
          summary.errors.push({ row: rowNumber, label, detail: 'El nombre es requerido y debe tener máximo 255 caracteres.' });
          continue;
        }
        if (!collegeId || !colleges.has(collegeId)) {
          summary.errors.push({ row: rowNumber, label, detail: 'La facultad indicada no existe.' });
          continue;
        }
        if (!colleges.get(collegeId)?.active) {
          summary.errors.push({ row: rowNumber, label, detail: 'La facultad indicada está inactiva.' });
          continue;
        }
        if (yearText && (!Number.isInteger(year) || year! < 1900 || year! > 2200)) {
          summary.errors.push({ row: rowNumber, label, detail: 'El año fin de acreditación no es válido.' });
          continue;
        }
        if (existing.has(id)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Ya existe un programa con ese id.' });
          continue;
        }
        if (seen.has(id)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Registro repetido dentro del archivo.' });
          continue;
        }

        seen.add(id);
        try {
          await firstValueFrom(this.userApi.createProgram({ id, name, college_id: collegeId, accredited, accreditation_end_year: year, active }));
          existing.add(id);
          summary.success.push({ row: rowNumber, label, detail: name });
        } catch (err) {
          summary.errors.push({ row: rowNumber, label, detail: this.errorText(err) });
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
    this.error.set('');
    forkJoin({
      programs: this.userApi.getPrograms(),
      colleges: this.userApi.getColleges(),
    }).subscribe({
      next: ({ programs, colleges }) => {
        this.colleges.set(colleges ?? []);
        const collegeName = new Map<string, string>((colleges ?? []).map(c => [c.id, c.name]));
        this.programs.set((programs ?? []).map(p => ({ ...p, collegeName: collegeName.get(p.college_id) ?? '' })));
        this.loading.set(false);
      },
      error: e => { this.loading.set(false); this.showError(e); },
    });
  }

  showErr(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  openCreate(): void {
    this.editing.set(false);
    this.editId.set(null);
    this.form.reset({ id: '', name: '', college_id: '', accredited: false, accreditation_end_year: null, active: true });
    this.form.get('id')?.enable();
    this.dialogVisible = true;
  }

  openEdit(program: Program): void {
    this.editing.set(true);
    this.editId.set(program.id);
    this.form.reset({
      id: program.id,
      name: program.name,
      college_id: program.college_id,
      accredited: program.accredited,
      accreditation_end_year: program.accreditation_end_year ?? null,
      active: program.active,
    });
    this.form.get('id')?.disable();
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Program = {
      id: String(raw.id).trim().toUpperCase(),
      name: String(raw.name).trim(),
      college_id: String(raw.college_id).trim().toUpperCase(),
      accredited: !!raw.accredited,
      accreditation_end_year: raw.accreditation_end_year ? Number(raw.accreditation_end_year) : null,
      active: !!raw.active,
    };
    const id = this.editId();
    const request = this.editing() && id
      ? this.userApi.updateProgram(id, { ...body, id })
      : this.userApi.createProgram(body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.messageService.add({ severity: 'success', summary: this.editing() ? 'Actualizado' : 'Creado', detail: this.editing() ? 'Programa actualizado.' : 'Programa creado.' });
        this.reload();
      },
      error: e => { this.saving.set(false); this.showError(e); },
    });
  }

  toggleActive(program: Program): void {
    this.userApi.updateProgram(program.id, { active: !program.active }).subscribe({
      next: () => this.reload(),
      error: e => this.showError(e),
    });
  }

  confirmDelete(program: Program): void {
    this.confirmationService.confirm({
      header: 'Borrar programa',
      message: `¿Borrar el programa ${program.id}? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Borrar',
      rejectLabel: 'Cancelar',
      accept: () => this.delete(program),
    });
  }

  private delete(program: Program): void {
    this.userApi.deleteProgram(program.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Borrado', detail: `Programa ${program.id} borrado.` });
        this.reload();
      },
      error: e => this.showError(e),
    });
  }

  private showError(err: HttpErrorResponse): void {
    const detail = this.errorText(err);
    this.error.set(detail);
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }

  private errorText(err: unknown): string {
    const http = err as HttpErrorResponse;
    if (http?.status === 401) return 'El catálogo de programas requiere una sesión autenticada.';
    if (http?.status === 503) return 'Servicio no disponible, intenta en unos segundos';
    if (http?.status === 404) return 'No encontrado';
    return typeof http?.error?.detail === 'string' ? http.error.detail : 'Ocurrió un error inesperado';
  }
}
