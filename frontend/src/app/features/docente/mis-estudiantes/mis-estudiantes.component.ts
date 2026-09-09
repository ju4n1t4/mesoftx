import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Student {
  name: string;
  id: string;
  program: string;
  faculty: string;
  initial: string;
}

const STUDENTS_KEY = 'mesoftx_students';

@Component({
  selector: 'app-mis-estudiantes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Mis estudiantes</h1>
        <p>Carga la lista de estudiantes de tu curso. Al cargarla, MESOFTX toma nombre, ID estudiantil,
        programa y facultad de cada estudiante desde tu archivo y los deja listos para
        valorar con la rúbrica.</p>
      </div>

      <div class="upload-row">
        <!-- Zona de carga -->
        <div class="upload-zone"
             [class.dragging]="isDragging"
             (dragover)="$event.preventDefault(); isDragging = true"
             (dragleave)="isDragging = false"
             (drop)="onDrop($event)"
             (click)="fileInput.click()">
          <input #fileInput type="file" accept=".csv" style="display:none" (change)="onFileChange($event)" />
          <div class="upload-icon-wrap"><i class="pi pi-upload"></i></div>
          <div class="upload-label">Arrastra tu archivo o haz clic para subir</div>
          <div class="upload-hint">Archivo CSV · columnas: Nombre, ID estudiantil, Programa, Facultad</div>
        </div>

        <!-- Panel de ayuda -->
        <div class="help-panel">
          <div class="help-panel-title">Formato del archivo</div>
          <div class="help-panel-desc">La primera fila debe contener los encabezados. Cada fila siguiente representa un estudiante con sus columnas separadas por comas.</div>
        </div>
      </div>

      <!-- Estado vacío: aún no se ha cargado archivo -->
      <div class="empty-box" *ngIf="students().length === 0 && !parseError()">
        <div class="empty-icon"><i class="pi pi-users"></i></div>
        <div class="empty-title">No hay estudiantes cargados</div>
        <div class="empty-desc">Sube el archivo CSV de tu curso para ver la lista de estudiantes lista para valorar.</div>
      </div>

      <div class="state-box error" *ngIf="parseError()">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ parseError() }}</span>
      </div>

      <!-- Tabla — solo con datos reales del archivo -->
      <div class="list-card" *ngIf="students().length > 0">
        <div class="list-header">
          <div class="list-meta">
            Lista cargada
            <span class="list-detail">{{ students().length }} estudiantes</span>
          </div>
          <button class="btn-clear" (click)="clear()">Quitar lista</button>
        </div>

        <table class="est-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th>Estudiante</th>
              <th>ID Estudiantil</th>
              <th>Programa</th>
              <th>Facultad</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of students(); let i = index">
              <td class="col-num">{{ i + 1 }}</td>
              <td>
                <div class="st-cell">
                  <div class="st-av">{{ s.initial }}</div>
                  <span class="st-name">{{ s.name }}</span>
                </div>
              </td>
              <td class="st-id">{{ s.id }}</td>
              <td><span class="prog-tag">{{ s.program }}</span></td>
              <td class="st-faculty">{{ s.faculty }}</td>
            </tr>
          </tbody>
        </table>

        <div class="list-footer">
          <a routerLink="/docente/valoraciones/registrar" class="btn-rubric">
            Ir a valorar con la rúbrica →
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .upload-row {
      display: grid; grid-template-columns: 1fr 260px; gap: 16px; margin-bottom: 24px;
    }
    .upload-zone {
      border: 2px dashed rgba(255,165,2,0.5);
      background: rgba(255,165,2,0.03);
      border-radius: var(--radius-md);
      padding: 44px 24px; text-align: center; cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    }
    .upload-zone:hover, .upload-zone.dragging {
      border-color: var(--primary);
      background: rgba(255,165,2,0.06);
    }
    .upload-icon-wrap {
      width: 52px; height: 52px; background: rgba(255,165,2,0.12);
      border-radius: var(--radius-md); margin-bottom: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; color: var(--primary);
    }
    .upload-label { font-size: 15px; font-weight: 600; color: var(--text); }
    .upload-hint  { font-size: 13px; color: var(--text-muted); }

    .help-panel {
      background: var(--sidebar-bg); border-radius: var(--radius-md);
      padding: 24px; display: flex; flex-direction: column; gap: 10px;
    }
    .help-panel-title { font-size: 14px; font-weight: 700; color: #fff; }
    .help-panel-desc  { font-size: 13px; color: #9AA0AD; line-height: 1.6; }

    .list-card {
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden;
    }
    .list-header {
      display: flex; align-items: center; padding: 14px 20px;
      border-bottom: 1px solid var(--border);
    }
    .list-meta { font-size: 14px; font-weight: 700; color: var(--text); }
    .list-detail {
      font-size: 13px; font-weight: 400; color: var(--text-muted); margin-left: 8px;
    }
    .btn-clear {
      margin-left: auto; font-size: 12px; font-weight: 600; padding: 6px 12px;
      background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm);
      color: var(--text-muted); cursor: pointer; font-family: inherit;
    }
    .btn-clear:hover { border-color: var(--badge-expired); color: var(--badge-expired); }

    .est-table { width: 100%; border-collapse: collapse; }
    .est-table thead th {
      padding: 10px 20px; text-align: left; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--text-muted); background: var(--surface-2);
      border-bottom: 1px solid var(--border);
    }
    .est-table thead th.col-num { width: 48px; }
    .est-table tbody td {
      padding: 12px 20px; border-bottom: 1px solid var(--border);
      font-size: 14px; color: var(--text);
    }
    .est-table tbody tr:last-child td { border-bottom: none; }
    .est-table tbody tr:hover td { background: var(--surface-2); }

    .col-num  { color: var(--text-muted); font-size: 13px; }
    .st-cell  { display: flex; align-items: center; gap: 10px; }
    .st-av {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--accent); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 12px; flex-shrink: 0;
    }
    .st-name    { font-size: 14px; font-weight: 500; color: var(--text); }
    .st-id      { color: var(--accent); font-weight: 600; font-size: 13px; }
    .prog-tag   {
      font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 4px;
      background: rgba(124,58,237,0.08); color: var(--accent);
    }
    .st-faculty { color: var(--text-muted); font-size: 13px; }

    .list-footer {
      padding: 16px 20px; border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end;
    }
    .btn-rubric {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--primary); color: #1A1A2E;
      padding: 11px 24px; border-radius: var(--radius-sm);
      font-size: 14px; font-weight: 700; text-decoration: none;
      transition: background 0.15s;
    }
    .btn-rubric:hover { background: var(--primary-dark); color: #1A1A2E; }

    .state-box { display: flex; align-items: center; gap: 10px; padding: 16px 20px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 14px; }
    .state-box.error { color: var(--badge-expired); border-color: var(--badge-expired-bg); }
    .empty-box {
      background: #fff; border: 1px dashed var(--border); border-radius: var(--radius-md);
      padding: 48px 24px; text-align: center;
    }
    .empty-icon {
      width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 14px;
      background: var(--surface-2); color: var(--text-muted);
      display: flex; align-items: center; justify-content: center; font-size: 24px;
    }
    .empty-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
    .empty-desc  { font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto; line-height: 1.6; }
  `]
})
export class MisEstudiantesComponent {
  isDragging = false;
  students   = signal<Student[]>([]);
  parseError = signal<string | null>(null);

  constructor() {
    try {
      const raw = localStorage.getItem(STUDENTS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as Student[];
        if (Array.isArray(arr) && arr.length) this.students.set(arr);
      }
    } catch { /* sin lista previa */ }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.readFile(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.readFile(file);
  }

  clear() {
    this.students.set([]);
    this.parseError.set(null);
    try { localStorage.removeItem(STUDENTS_KEY); } catch { /* noop */ }
  }

  private readFile(file: File) {
    this.parseError.set(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = this.parseCsv(String(reader.result ?? ''));
        if (!parsed.length) {
          this.parseError.set('El archivo no contiene filas de estudiantes válidas.');
          return;
        }
        this.students.set(parsed);
        try { localStorage.setItem(STUDENTS_KEY, JSON.stringify(parsed)); } catch { /* noop */ }
      } catch {
        this.parseError.set('No se pudo leer el archivo. Verifica que sea un CSV con los encabezados esperados.');
      }
    };
    reader.onerror = () => this.parseError.set('No se pudo leer el archivo.');
    reader.readAsText(file);
  }

  private parseCsv(text: string): Student[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = this.splitRow(lines[0]).map(h => h.toLowerCase());
    const idx = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
    const iName    = idx(['nombre', 'name', 'estudiante']);
    const iId      = idx(['id', 'documento', 'código', 'codigo']);
    const iProgram = idx(['programa', 'program', 'carrera']);
    const iFaculty = idx(['facultad', 'faculty']);

    return lines.slice(1).map(line => {
      const cols = this.splitRow(line);
      const name = (iName >= 0 ? cols[iName] : cols[0]) ?? '';
      return {
        name: name.trim(),
        id: (iId >= 0 ? cols[iId] : '').trim(),
        program: (iProgram >= 0 ? cols[iProgram] : '').trim(),
        faculty: (iFaculty >= 0 ? cols[iFaculty] : '').trim(),
        initial: this.initials(name),
      };
    }).filter(s => s.name);
  }

  private splitRow(row: string): string[] {
    return row.split(/[,;]/).map(c => c.replace(/^"|"$/g, '').trim());
  }

  private initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (!parts.length || !parts[0]) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
}
