import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
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

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { Program, College } from '../../../../domain/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../../../../shared/services/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../../../../shared/ui/organisms/bulk-result-dialog/bulk-result-dialog.component';

interface ProgramView extends Program { collegeName: string; }

@Component({
  selector: 'app-programas',
  standalone: true,
  imports: [InputAtom, ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule, BulkResultDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './programas.component.html',
  styleUrl: './programas.component.scss',
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
