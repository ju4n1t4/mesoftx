import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { College } from '../../../core/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../shared/bulk-import/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../shared/bulk-import/bulk-result-dialog.component';

@Component({
  selector: 'app-facultades',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule, BulkResultDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="content-area">
      <div class="page-header">
        <h1>Facultades</h1>
        <p>Administra las facultades usadas por programas, materias y resultados de aprendizaje.</p>
      </div>

      <div class="toolbar">
        <button pButton type="button" label="Descargar plantilla" icon="pi pi-download" class="p-button-secondary" (click)="downloadTemplate()"></button>
        <button pButton type="button" label="Cargar Excel" icon="pi pi-upload" class="p-button-secondary" (click)="bulkInput.click()"></button>
        <input #bulkInput type="file" accept=".xlsx" hidden (change)="onBulkFile($event)" />
        <button pButton type="button" label="Nueva facultad" icon="pi pi-plus" (click)="openCreate()"></button>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <p-table *ngIf="!loading()" [value]="colleges()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header">
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Estado</th>
            <th style="width:10rem">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td><span class="code">{{ c.id }}</span></td>
            <td>{{ c.name }}</td>
            <td>
              <button type="button" class="state-switch" [class.is-active]="c.active" (click)="toggleActive(c)" [attr.aria-label]="c.active ? 'Desactivar' : 'Activar'">
                <span></span>
              </button>
            </td>
            <td class="actions">
              <button pButton type="button" icon="pi pi-pencil" class="p-button-sm p-button-text" (click)="openEdit(c)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger" (click)="confirmDelete(c)"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="4" class="empty-cell">No hay facultades registradas.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '460px' }" [header]="editing() ? 'Editar facultad' : 'Nueva facultad'">
      <form [formGroup]="form" class="dialog-form">
        <label>Código
          <input pInputText formControlName="id" maxlength="3" placeholder="Ej. ING" />
          <small class="err" *ngIf="showErr('id')">Código requerido, máximo 3 caracteres.</small>
        </label>
        <label>Nombre
          <input pInputText formControlName="name" maxlength="255" placeholder="Ej. Facultad de Ingenieria" />
          <small class="err" *ngIf="showErr('name')">Nombre requerido.</small>
        </label>
        <label class="check-row">
          <input type="checkbox" formControlName="active" />
          <span>Activa</span>
        </label>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" [label]="saving() ? 'Guardando...' : 'Guardar'" [disabled]="saving()" (click)="save()"></button>
      </ng-template>
    </p-dialog>

    <app-bulk-result-dialog
      title="Resultado cargue masivo de facultades"
      [(visible)]="bulkVisible"
      [summary]="bulkSummary">
    </app-bulk-result-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .actions { display: flex; gap: 6px; }
    .code { color: var(--accent); font-weight: 700; }
    .state-switch { border: 0; display: inline-flex; align-items: center; width: 40px; height: 22px; padding: 2px; border-radius: 999px; background: #d1d5db; vertical-align: middle; cursor: pointer; }
    .state-switch span { width: 18px; height: 18px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, .18); transition: transform .18s ease; }
    .state-switch.is-active { background: #10b981; }
    .state-switch.is-active span { transform: translateX(18px); }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .dialog-form input { width: 100%; }
    .check-row { flex-direction: row !important; align-items: center; gap: 8px !important; }
    .check-row input { width: auto; }
    .err { color: var(--badge-expired, #dc2626); font-size: 12px; }
  `],
})
export class FacultadesComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  dialogVisible = false;
  bulkVisible = false;
  bulkSummary: BulkImportSummary = { success: [], skipped: [], errors: [] };
  colleges = signal<College[]>([]);
  private editId = signal<string | null>(null);

  form: FormGroup;

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
      active: [true],
    });
  }

  downloadTemplate(): void {
    this.bulkExcel.downloadTemplate('plantilla_facultades.xlsx', ['id', 'name', 'active'], 'Facultades');
  }

  async onBulkFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const summary: BulkImportSummary = { success: [], skipped: [], errors: [] };
    try {
      const rows = await this.bulkExcel.readRows(file);
      const existing = new Set(this.colleges().map(c => c.id.toUpperCase()));
      const seen = new Set<string>();

      for (let index = 0; index < rows.length; index++) {
        const rowNumber = index + 2;
        const id = this.bulkExcel.value(rows[index], 'id').toUpperCase();
        const name = this.bulkExcel.value(rows[index], 'name');
        const active = this.bulkExcel.boolValue(rows[index], 'active', true);
        const label = id || `Fila ${rowNumber}`;

        if (!id || id.length > 3) {
          summary.errors.push({ row: rowNumber, label, detail: 'El id es requerido y debe tener máximo 3 caracteres.' });
          continue;
        }
        if (!name || name.length > 255) {
          summary.errors.push({ row: rowNumber, label, detail: 'El nombre es requerido y debe tener máximo 255 caracteres.' });
          continue;
        }
        if (existing.has(id)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Ya existe una facultad con ese id.' });
          continue;
        }
        if (seen.has(id)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Registro repetido dentro del archivo.' });
          continue;
        }

        seen.add(id);
        try {
          await firstValueFrom(this.userApi.createCollege({ id, name, active }));
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

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.userApi.getColleges().subscribe({
      next: colleges => { this.colleges.set(colleges ?? []); this.loading.set(false); },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  showErr(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  openCreate(): void {
    this.editing.set(false);
    this.editId.set(null);
    this.form.reset({ id: '', name: '', active: true });
    this.form.get('id')?.enable();
    this.dialogVisible = true;
  }

  openEdit(college: College): void {
    this.editing.set(true);
    this.editId.set(college.id);
    this.form.reset({ id: college.id, name: college.name, active: college.active });
    this.form.get('id')?.disable();
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: College = {
      id: String(raw.id).trim().toUpperCase(),
      name: String(raw.name).trim(),
      active: !!raw.active,
    };
    const id = this.editId();
    const request = this.editing() && id
      ? this.userApi.updateCollege(id, { ...body, id })
      : this.userApi.createCollege(body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.messageService.add({ severity: 'success', summary: this.editing() ? 'Actualizada' : 'Creada', detail: this.editing() ? 'Facultad actualizada.' : 'Facultad creada.' });
        this.reload();
      },
      error: e => { this.saving.set(false); this.showError(e); },
    });
  }

  toggleActive(college: College): void {
    this.userApi.updateCollege(college.id, { active: !college.active }).subscribe({
      next: () => this.reload(),
      error: e => this.showError(e),
    });
  }

  confirmDelete(college: College): void {
    this.confirmationService.confirm({
      header: 'Borrar facultad',
      message: `¿Borrar la facultad ${college.id}? Esta acción también puede afectar programas relacionados.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Borrar',
      rejectLabel: 'Cancelar',
      accept: () => this.delete(college),
    });
  }

  private delete(college: College): void {
    this.userApi.deleteCollege(college.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Borrada', detail: `Facultad ${college.id} borrada.` });
        this.reload();
      },
      error: e => this.showError(e),
    });
  }

  private showError(err: HttpErrorResponse): void {
    const detail = this.errorText(err);
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }

  private errorText(err: unknown): string {
    const http = err as HttpErrorResponse;
    if (http?.status === 503) return 'Servicio no disponible, intenta en unos segundos';
    if (http?.status === 404) return 'No encontrado';
    return typeof http?.error?.detail === 'string' ? http.error.detail : 'Ocurrió un error inesperado';
  }
}
