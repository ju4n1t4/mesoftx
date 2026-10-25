import { InputAtom } from '../../../../../../shared/ui/atoms/input/input.directive';
import { ButtonAtom } from '../../../../../../shared/ui/atoms/button/button.directive';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { UserGateway as UserApiService } from '../../../../application/ports/user-api.service.port';
import { Subject, Student, StudentUploadRow } from '../../../../domain/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../../../../shared/services/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../../../../shared/ui/organisms/bulk-result-dialog/bulk-result-dialog.component';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [InputAtom, ButtonAtom, 
    CommonModule, RouterLink, FormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, MessageModule, ToastModule, ProgressSpinnerModule,
    BulkResultDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './estudiantes.component.html',
  styleUrl: './estudiantes.component.scss',
})
export class EstudiantesComponent implements OnInit {
  nrc = signal<number>(0);
  subject = signal<Subject | null>(null);
  forbidden = signal(false);
  saving = signal(false);
  formError = signal('');
  enrolled = signal<Student[]>([]);
  dialogVisible = false;
  bulkVisible = false;
  bulkSummary: BulkImportSummary = { success: [], skipped: [], errors: [] };
  studentForm: StudentUploadRow = { document_number: '', name: '' };

  constructor(
    private route: ActivatedRoute,
    private userApi: UserApiService,
    private bulkExcel: BulkExcelService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    const nrc = Number(this.route.snapshot.paramMap.get('nrc'));
    this.nrc.set(nrc);
    this.userApi.getMySubjects().subscribe({
      next: subjects => {
        const assigned = (subjects ?? []).find(s => s.nrc === nrc);
        if (assigned) this.subject.set(assigned);
        else this.forbidden.set(true);
      },
      error: e => {
        if (e.status === 403) this.forbidden.set(true);
        else this.showError(e);
      },
    });
    this.loadEnrolled();
  }

  openCreate(): void {
    this.studentForm = { document_number: '', name: '' };
    this.formError.set('');
    this.dialogVisible = true;
  }

  downloadTemplate(): void {
    this.bulkExcel.downloadTemplate('plantilla_estudiantes.xlsx', ['document_number', 'name'], 'Estudiantes');
  }

  async onBulkFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const summary: BulkImportSummary = { success: [], skipped: [], errors: [] };
    try {
      const rows = await this.bulkExcel.readRows(file);
      const enrolledDocs = new Set(this.enrolled().map(s => s.document_number));
      const seen = new Set<string>();
      const validRows: StudentUploadRow[] = [];

      for (let index = 0; index < rows.length; index++) {
        const rowNumber = index + 2;
        const document_number = this.bulkExcel.value(rows[index], 'document_number');
        const name = this.bulkExcel.value(rows[index], 'name');
        const label = document_number || `Fila ${rowNumber}`;

        if (!document_number || document_number.length > 25) {
          summary.errors.push({ row: rowNumber, label, detail: 'El documento es requerido y debe tener máximo 25 caracteres.' });
          continue;
        }
        if (!name || name.length > 255) {
          summary.errors.push({ row: rowNumber, label, detail: 'El nombre es requerido y debe tener máximo 255 caracteres.' });
          continue;
        }
        if (enrolledDocs.has(document_number)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'El estudiante ya está matriculado en este curso.' });
          continue;
        }
        if (seen.has(document_number)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Documento repetido dentro del archivo.' });
          continue;
        }

        seen.add(document_number);
        validRows.push({ document_number, name });
        summary.success.push({ row: rowNumber, label, detail: name });
      }

      if (validRows.length > 0) {
        this.saving.set(true);
        await this.uploadRows(validRows);
        this.saving.set(false);
      }
    } catch (err) {
      this.saving.set(false);
      summary.errors.push({ row: 0, label: file.name, detail: this.errorText(err) });
    }

    this.bulkSummary = summary;
    this.bulkVisible = true;
    this.loadEnrolled();
  }

  saveManual(): void {
    const row: StudentUploadRow = {
      document_number: this.studentForm.document_number.trim(),
      name: this.studentForm.name.trim(),
    };
    const error = this.validateRow(row);
    if (error) { this.formError.set(error); return; }
    if (this.enrolled().some(s => s.document_number === row.document_number)) {
      this.formError.set('El estudiante ya está matriculado en este curso.');
      return;
    }

    this.saving.set(true);
    this.uploadRows([row]).then(() => {
      this.saving.set(false);
      this.dialogVisible = false;
      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Estudiante matriculado en este curso.' });
      this.loadEnrolled();
    }).catch(err => {
      this.saving.set(false);
      this.formError.set(this.errorText(err));
    });
  }

  private validateRow(row: StudentUploadRow): string | null {
    if (!row.document_number || row.document_number.length > 25) return 'El documento es requerido y debe tener máximo 25 caracteres.';
    if (!row.name || row.name.length > 255) return 'El nombre es requerido y debe tener máximo 255 caracteres.';
    return null;
  }

  private uploadRows(rows: StudentUploadRow[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userApi.uploadStudents(this.nrc(), rows).subscribe({ next: () => resolve(), error: reject });
    });
  }

  private loadEnrolled(): void {
    this.userApi.getSubjectStudents(this.nrc()).subscribe({
      next: s => this.enrolled.set((s ?? []).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))),
      error: e => {
        if (e.status === 403) this.forbidden.set(true);
        else this.showError(e);
      },
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
