import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
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

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { College } from '../../../../domain/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../../../../shared/services/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../../../../shared/ui/organisms/bulk-result-dialog/bulk-result-dialog.component';

@Component({
  selector: 'app-facultades',
  standalone: true,
  imports: [InputAtom, ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule, BulkResultDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './facultades.component.html',
  styleUrl: './facultades.component.scss',
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
