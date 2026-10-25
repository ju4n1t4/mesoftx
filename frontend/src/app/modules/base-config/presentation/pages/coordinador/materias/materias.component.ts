import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
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

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { Subject, Period, Program } from '../../../../domain/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../../../../shared/services/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../../../../shared/ui/organisms/bulk-result-dialog/bulk-result-dialog.component';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [InputAtom, ButtonAtom, 
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule,
    ToastModule, ProgressSpinnerModule, ConfirmDialogModule, BulkResultDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './materias.component.html',
  styleUrl: './materias.component.scss',
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
