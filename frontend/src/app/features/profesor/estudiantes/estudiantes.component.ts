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

import { UserApiService } from '../../../core/services/user-api.service';
import { Subject, Student, StudentUploadRow } from '../../../core/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../shared/bulk-import/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../shared/bulk-import/bulk-result-dialog.component';

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule, MessageModule, ToastModule, ProgressSpinnerModule,
    BulkResultDialogComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="content-area">
      <div class="page-header">
        <h1>Listado de Estudiantes</h1>
        <p *ngIf="subject() as s">{{ s.materia_curso }} · {{ s.name }} (NRC {{ s.nrc }})</p>
      </div>

      <p-message *ngIf="forbidden()" severity="error" styleClass="block-msg">
        <span>Este curso no está asignado a ti. <a routerLink="/profesor/mis-cursos" class="link">Volver a mis cursos</a></span>
      </p-message>

      <ng-container *ngIf="!forbidden()">
        <div class="explain">
          Si un estudiante ya fue cargado por otro profesor en otro curso, se reutiliza el registro
          existente y solo se matricula en este curso. Los estudiantes no tienen usuario ni contraseña:
          solo existen para poder valorarlos.
        </div>

        <div class="upload-card">
          <div class="upload-row">
            <div>
              <div class="uc-title">Carga masiva de estudiantes</div>
              <div class="uc-subtitle">Archivo Excel con encabezados <code>document_number</code> y <code>name</code>.</div>
            </div>
            <div class="upload-actions">
              <button pButton type="button" label="Nuevo estudiante" icon="pi pi-user-plus"
                      class="p-button-sm" (click)="openCreate()"></button>
              <button pButton type="button" label="Descargar plantilla Excel" icon="pi pi-download"
                      class="p-button-sm p-button-secondary" (click)="downloadTemplate()"></button>
              <button pButton type="button" label="Cargar Excel" icon="pi pi-upload"
                      class="p-button-sm p-button-secondary" (click)="bulkInput.click()" [disabled]="saving()"></button>
              <input #bulkInput type="file" accept=".xlsx" hidden (change)="onBulkFile($event)" />
            </div>
          </div>
        </div>

        <div class="enrolled">
          <div class="en-title">Estudiantes matriculados en este curso</div>
          <p-table [value]="enrolled()" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>Documento</th><th>Nombre</th><th>Programa</th></tr></ng-template>
            <ng-template pTemplate="body" let-s>
              <tr><td>{{ s.document_number }}</td><td>{{ s.name }}</td><td>{{ s.program_id }}</td></tr>
            </ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="empty-cell">Todavía no hay estudiantes matriculados.</td></tr></ng-template>
          </p-table>
        </div>
      </ng-container>
    </div>

    <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '440px' }" header="Nuevo estudiante">
      <div class="dialog-form">
        <label>Documento
          <input pInputText [(ngModel)]="studentForm.document_number" maxlength="25" placeholder="Ej. 100200300" />
        </label>
        <label>Nombre
          <input pInputText [(ngModel)]="studentForm.name" maxlength="255" placeholder="Ej. Juan Lozada" />
        </label>
        <small class="err" *ngIf="formError()">{{ formError() }}</small>
      </div>
      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cancelar" class="p-button-text" (click)="dialogVisible = false"></button>
        <button pButton type="button" [label]="saving() ? 'Guardando...' : 'Guardar'" [disabled]="saving()" (click)="saveManual()"></button>
      </ng-template>
    </p-dialog>

    <app-bulk-result-dialog
      title="Resultado cargue masivo de estudiantes"
      [(visible)]="bulkVisible"
      [summary]="bulkSummary">
    </app-bulk-result-dialog>
  `,
  styles: [`
    .block-msg, .explain { display: block; margin-bottom: 16px; }
    .link { color: var(--primary); font-weight: 600; }
    .explain { background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; font-size: 13px; color: var(--text-muted); line-height: 1.5; }
    .upload-card, .enrolled { width: 100%; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 16px; }
    .upload-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .upload-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
    .uc-title { font-size: 14px; font-weight: 800; color: var(--text); }
    .uc-subtitle { margin-top: 4px; font-size: 13px; color: var(--text-muted); }
    .uc-subtitle code { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; }
    .en-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
    .dialog-form { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }
    .dialog-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
    .dialog-form input { width: 100%; }
    .err { color: var(--badge-expired, #dc2626); font-size: 12px; }
  `],
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
