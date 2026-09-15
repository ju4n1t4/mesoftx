import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { UserApiService } from '../../../core/services/user-api.service';
import { Subject, Student, StudentUploadRow } from '../../../core/models/abet.models';

interface PreviewRow {
  document_number: string;
  name: string;
  error: string | null;
}

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    TableModule, ButtonModule, FileUploadModule, MessageModule, ToastModule, ProgressSpinnerModule,
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
            <div class="uc-title">Archivo CSV (encabezados: <code>document_number,name</code>)</div>
            <div class="upload-actions">
              <button pButton type="button" label="Descargar plantilla CSV" icon="pi pi-download"
                      class="p-button-sm p-button-secondary" (click)="downloadTemplate()"></button>
              <p-fileUpload mode="basic" chooseLabel="Elegir CSV" [auto]="true" accept=".csv"
                            [customUpload]="true" (uploadHandler)="onFile($event)" (onSelect)="onFile($event)">
              </p-fileUpload>
            </div>
          </div>
          <small class="parse-err" *ngIf="parseError()">{{ parseError() }}</small>
        </div>

        <div class="preview" *ngIf="preview().length > 0">
          <div class="pv-head">
            <span>{{ preview().length }} fila(s) leída(s)</span>
            <button pButton type="button" [label]="'Cargar ' + validCount() + ' estudiantes'" icon="pi pi-check"
                    [disabled]="validCount() === 0 || hasErrors() || saving()" (click)="submit()"></button>
          </div>
          <small class="pv-warn" *ngIf="hasErrors()">Corrige o quita las filas con error antes de cargar.</small>
          <p-table [value]="preview()" styleClass="p-datatable-sm">
            <ng-template pTemplate="header"><tr><th>#</th><th>Documento</th><th>Nombre</th><th>Estado</th></tr></ng-template>
            <ng-template pTemplate="body" let-r let-i="rowIndex">
              <tr [class.row-error]="r.error">
                <td>{{ i + 1 }}</td>
                <td>{{ r.document_number }}</td>
                <td>{{ r.name }}</td>
                <td><span class="ok" *ngIf="!r.error"><i class="pi pi-check"></i> OK</span><span class="bad" *ngIf="r.error">{{ r.error }}</span></td>
              </tr>
            </ng-template>
          </p-table>
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
  `,
  styles: [`
    .block-msg, .explain { display: block; margin-bottom: 16px; }
    .link { color: var(--primary); font-weight: 600; }
    .explain { background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; font-size: 13px; color: var(--text-muted); line-height: 1.5; }
    .upload-card { width: 100%; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 16px; }
    .upload-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .upload-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .uc-title { font-size: 13px; font-weight: 600; }
    .uc-title code { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; }
    .parse-err { color: var(--badge-expired, #dc2626); display: block; margin-top: 8px; }
    .preview, .enrolled { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 20px; margin-bottom: 16px; }
    .pv-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .pv-warn { color: var(--badge-expired, #dc2626); display: block; margin-bottom: 8px; }
    .en-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
    .row-error { background: rgba(220,38,38,0.05); }
    .ok { color: var(--badge-open, #16a34a); font-weight: 600; }
    .bad { color: var(--badge-expired, #dc2626); font-weight: 600; }
    .empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
  `],
})
export class EstudiantesComponent implements OnInit {
  nrc = signal<number>(0);
  subject = signal<Subject | null>(null);
  forbidden = signal(false);
  saving = signal(false);
  parseError = signal<string | null>(null);
  preview = signal<PreviewRow[]>([]);
  enrolled = signal<Student[]>([]);

  validCount = computed(() => this.preview().filter(r => !r.error).length);
  hasErrors = computed(() => this.preview().some(r => r.error));

  constructor(
    private route: ActivatedRoute,
    private userApi: UserApiService,
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

  private loadEnrolled(): void {
    this.userApi.getSubjectStudents(this.nrc()).subscribe({
      next: s => this.enrolled.set(s ?? []),
      error: e => {
        if (e.status === 403) this.forbidden.set(true);
        else this.showError(e);
      },
    });
  }

  onFile(event: { files: File[] }): void {
    const file = event.files?.[0];
    if (!file) return;
    this.parseError.set(null);
    const reader = new FileReader();
    reader.onload = () => this.parseCsv(String(reader.result ?? ''));
    reader.onerror = () => this.parseError.set('No se pudo leer el archivo.');
    reader.readAsText(file);
  }

  private parseCsv(text: string): void {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { this.parseError.set('El archivo no tiene filas de datos.'); this.preview.set([]); return; }
    const headers = this.splitRow(lines[0]).map(h => h.toLowerCase());
    const iDoc = headers.findIndex(h => h.includes('document'));
    const iName = headers.findIndex(h => h.includes('name') || h.includes('nombre'));
    if (iDoc < 0 || iName < 0) {
      this.parseError.set('El archivo debe tener las columnas document_number y name.');
      this.preview.set([]);
      return;
    }
    const seen = new Set<string>();
    const rows: PreviewRow[] = lines.slice(1).map(line => {
      const cols = this.splitRow(line);
      const document_number = (cols[iDoc] ?? '').trim();
      const name = (cols[iName] ?? '').trim();
      let error: string | null = null;
      if (!document_number) error = 'Documento vacío';
      else if (document_number.length > 25) error = 'Documento > 25 caracteres';
      else if (!name) error = 'Nombre vacío';
      else if (name.length > 255) error = 'Nombre > 255 caracteres';
      else if (seen.has(document_number)) error = 'Documento duplicado en el archivo';
      seen.add(document_number);
      return { document_number, name, error };
    });
    this.preview.set(rows);
  }

  private splitRow(row: string): string[] {
    return row.split(/[,;]/).map(c => c.replace(/^"|"$/g, '').trim());
  }

  downloadTemplate(): void {
    const csv = '\ufeffdocument_number,name\r\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_estudiantes.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  submit(): void {
    if (this.hasErrors() || this.validCount() === 0) return;
    const rows: StudentUploadRow[] = this.preview()
      .filter(r => !r.error)
      .map(r => ({ document_number: r.document_number, name: r.name }));
    this.saving.set(true);
    this.userApi.uploadStudents(this.nrc(), rows).subscribe({
      next: res => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Cargados',
          detail: `${res.created} estudiantes nuevos, ${res.already_existed} ya existían, ${res.enrolled} matriculados en este curso.`,
        });
        this.preview.set([]);
        this.loadEnrolled();
      },
      error: e => {
        this.saving.set(false);
        if (e.status === 403) this.forbidden.set(true);
        this.showError(e);
      },
    });
  }

  private showError(err: HttpErrorResponse): void {
    let detail: string;
    if (err.status === 503) detail = 'Servicio no disponible, intenta en unos segundos';
    else if (err.status === 404) detail = 'No encontrado';
    else detail = typeof err.error?.detail === 'string' ? err.error.detail : 'Ocurrió un error inesperado';
    this.messageService.add({ severity: 'error', summary: `Error ${err.status}`, detail });
  }
}
