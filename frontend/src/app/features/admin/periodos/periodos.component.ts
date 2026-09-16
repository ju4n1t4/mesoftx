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
import { Period } from '../../../core/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../shared/bulk-import/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../shared/bulk-import/bulk-result-dialog.component';

@Component({
  selector: 'app-admin-periodos',
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
        <h1>Periodos</h1>
        <p>Gestiona los periodos académicos utilizados por materias, programación y reportes.</p>
      </div>

      <div class="toolbar">
        <button pButton type="button" label="Descargar plantilla" icon="pi pi-download" class="p-button-secondary" (click)="downloadTemplate()"></button>
        <button pButton type="button" label="Cargar Excel" icon="pi pi-upload" class="p-button-secondary" (click)="bulkInput.click()"></button>
        <input #bulkInput type="file" accept=".xlsx" hidden (change)="onBulkFile($event)" />
        <button pButton type="button" label="Nuevo periodo" icon="pi pi-plus" (click)="openCreate()"></button>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <p-table *ngIf="!loading()" [value]="periods()" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header">
          <tr>
            <th>ID</th>
            <th>Código</th>
            <th>Año</th>
            <th>Periodo</th>
            <th>Estado</th>
            <th style="width:9rem">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td>{{ p.id }}</td>
            <td><span class="period-code">{{ p.code }}</span></td>
            <td>{{ periodYear(p.code) }}</td>
            <td>{{ periodTerm(p.code) }}</td>
            <td>
              <button type="button" class="state-switch" [class.is-active]="p.active"
                      (click)="activatePeriod(p)"
                      [attr.aria-label]="p.active ? 'Periodo activo' : 'Activar periodo'">
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
          <tr><td colspan="6" class="empty-cell">No hay periodos registrados.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '440px' }" [header]="editing() ? 'Editar periodo' : 'Nuevo periodo'">
      <form [formGroup]="form" class="dialog-form">
        <label>Código
          <input pInputText formControlName="code" maxlength="6" placeholder="Ej. 202610" />
          <small class="err" *ngIf="showErr('code')">Código requerido, máximo 6 caracteres.</small>
        </label>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" [label]="saving() ? 'Guardando...' : 'Guardar'" [disabled]="saving()" (click)="save()"></button>
      </ng-template>
    </p-dialog>

    <app-bulk-result-dialog
      title="Resultado cargue masivo de periodos"
      [(visible)]="bulkVisible"
      [summary]="bulkSummary">
    </app-bulk-result-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .actions { display: flex; gap: 6px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .period-code { color: var(--accent); font-weight: 700; }
    .state-switch { border: 0; display: inline-flex; align-items: center; width: 40px; height: 22px; padding: 2px; border-radius: 999px; background: #d1d5db; vertical-align: middle; cursor: pointer; }
    .state-switch span { width: 18px; height: 18px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, .18); transition: transform .18s ease; }
    .state-switch.is-active { background: #10b981; }
    .state-switch.is-active span { transform: translateX(18px); }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .dialog-form input { width: 100%; }
    .err { color: var(--badge-expired, #dc2626); font-size: 12px; }
  `],
})
export class PeriodosComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  dialogVisible = false;
  bulkVisible = false;
  bulkSummary: BulkImportSummary = { success: [], skipped: [], errors: [] };
  periods = signal<Period[]>([]);
  private editId = signal<number | null>(null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private bulkExcel: BulkExcelService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(6)]],
    });
  }

  ngOnInit(): void {
    this.reload();
  }

  downloadTemplate(): void {
    this.bulkExcel.downloadTemplate('plantilla_periodos.xlsx', ['code', 'active'], 'Periodos');
  }

  async onBulkFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const summary: BulkImportSummary = { success: [], skipped: [], errors: [] };
    try {
      const rows = await this.bulkExcel.readRows(file);
      const existing = new Set(this.periods().map(p => p.code));
      const seen = new Set<string>();

      for (let index = 0; index < rows.length; index++) {
        const rowNumber = index + 2;
        const code = this.bulkExcel.value(rows[index], 'code');
        const active = this.bulkExcel.boolValue(rows[index], 'active', false);
        const label = code || `Fila ${rowNumber}`;

        if (!/^\d{6}$/.test(code)) {
          summary.errors.push({ row: rowNumber, label, detail: 'El código es requerido y debe tener 6 dígitos. Ejemplo: 202610.' });
          continue;
        }
        if (existing.has(code)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Ya existe un periodo con ese código.' });
          continue;
        }
        if (seen.has(code)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Registro repetido dentro del archivo.' });
          continue;
        }

        seen.add(code);
        try {
          await firstValueFrom(this.userApi.createPeriod({ code, active }));
          existing.add(code);
          summary.success.push({ row: rowNumber, label, detail: active ? 'Periodo creado y activado.' : 'Periodo creado.' });
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
    this.userApi.getPeriods().subscribe({
      next: periods => { this.periods.set(periods ?? []); this.loading.set(false); },
      error: e => { this.showError(e); this.loading.set(false); },
    });
  }

  showErr(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  periodYear(code: string): string {
    return code?.length >= 4 ? code.slice(0, 4) : '-';
  }

  periodTerm(code: string): string {
    return code?.length > 4 ? code.slice(4) : '-';
  }

  openCreate(): void {
    this.editing.set(false);
    this.editId.set(null);
    this.form.reset({ code: '' });
    this.dialogVisible = true;
  }

  openEdit(period: Period): void {
    this.editing.set(true);
    this.editId.set(period.id);
    this.form.reset({ code: period.code });
    this.dialogVisible = true;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const code = String(this.form.getRawValue().code ?? '').trim();
    const id = this.editId();
    const request = this.editing() && id != null
      ? this.userApi.updatePeriod(id, { code })
      : this.userApi.createPeriod({ code, active: this.periods().length === 0 });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: this.editing() ? 'Actualizado' : 'Creado',
          detail: this.editing() ? 'Periodo actualizado.' : 'Periodo creado.',
        });
        this.reload();
      },
      error: e => { this.saving.set(false); this.showError(e); },
    });
  }

  activatePeriod(period: Period): void {
    if (period.active) {
      this.messageService.add({ severity: 'info', summary: 'Periodo activo', detail: 'Este ya es el periodo activo.' });
      return;
    }
    this.userApi.updatePeriod(period.id, { active: true }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Periodo activo', detail: `Periodo ${period.code} activado.` });
        this.reload();
      },
      error: e => this.showError(e),
    });
  }

  confirmDelete(period: Period): void {
    this.confirmationService.confirm({
      header: 'Borrar periodo',
      message: `¿Borrar el periodo ${period.code}? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Borrar',
      rejectLabel: 'Cancelar',
      accept: () => this.delete(period),
    });
  }

  private delete(period: Period): void {
    this.userApi.deletePeriod(period.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Borrado', detail: `Periodo ${period.code} borrado.` });
        this.reload();
      },
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
