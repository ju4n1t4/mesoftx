import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

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

@Component({
  selector: 'app-admin-periodos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>

    <div class="content-area">
      <div class="page-header">
        <h1>Periodos</h1>
        <p>Gestiona los periodos academicos utilizados por materias, programacion y reportes.</p>
      </div>

      <div class="toolbar">
        <button pButton type="button" label="Nuevo periodo" icon="pi pi-plus" (click)="openCreate()"></button>
      </div>

      <div class="loading-wrap" *ngIf="loading()">
        <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }"></p-progressSpinner>
      </div>

      <p-table *ngIf="!loading()" [value]="periods()" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template pTemplate="header">
          <tr><th>ID</th><th>Codigo</th><th>Anio</th><th>Periodo</th><th style="width:9rem">Acciones</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td>{{ p.id }}</td>
            <td><span class="period-code">{{ p.code }}</span></td>
            <td>{{ periodYear(p.code) }}</td>
            <td>{{ periodTerm(p.code) }}</td>
            <td class="actions">
              <button pButton type="button" icon="pi pi-pencil" class="p-button-sm p-button-text" (click)="openEdit(p)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-sm p-button-text p-button-danger" (click)="confirmDelete(p)"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="empty-cell">No hay periodos registrados.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '440px' }" [header]="editing() ? 'Editar periodo' : 'Nuevo periodo'">
      <form [formGroup]="form" class="dialog-form">
        <label>Codigo
          <input pInputText formControlName="code" maxlength="6" placeholder="Ej. 202610" />
          <small class="err" *ngIf="showErr('code')">Codigo requerido, maximo 6 caracteres.</small>
        </label>
      </form>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" [label]="saving() ? 'Guardando...' : 'Guardar'" [disabled]="saving()" (click)="save()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .loading-wrap { display: flex; justify-content: center; padding: 48px; }
    .actions { display: flex; gap: 6px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 24px; }
    .period-code { color: var(--accent); font-weight: 700; }
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
  periods = signal<Period[]>([]);
  private editId = signal<number | null>(null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
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
      : this.userApi.createPeriod({ code });

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

  confirmDelete(period: Period): void {
    this.confirmationService.confirm({
      header: 'Borrar periodo',
      message: `Borrar el periodo ${period.code}? Esta accion no se puede deshacer.`,
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
    let detail: string;
    if (err.status === 503) detail = 'Servicio no disponible, intenta en unos segundos';
    else if (err.status === 404) detail = 'No encontrado';
    else detail = typeof err.error?.detail === 'string' ? err.error.detail : 'Ocurrio un error inesperado';
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }
}
