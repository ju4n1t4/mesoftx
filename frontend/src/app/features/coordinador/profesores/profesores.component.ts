import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UserApiService } from '../../../core/services/user-api.service';
import { User, Role, Program, UserCreate } from '../../../core/models/abet.models';
import { BulkExcelService, BulkImportSummary } from '../../../shared/bulk-import/bulk-excel.service';
import { BulkResultDialogComponent } from '../../../shared/bulk-import/bulk-result-dialog.component';

/** Datos del formulario de alta de profesor (modelo v13). */
interface ProfesorForm {
  name: string; document_number: string; email: string; password: string;
  role_id: number; program_id: string; active: boolean;
}

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule, BulkResultDialogComponent],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Profesores y roles</h1>
        <p>Asigna roles, programa académico y supervisa el avance de valoración de cada profesor.</p>
      </div>

      <div class="notice" *ngIf="error()"><i class="pi pi-info-circle"></i> <span>{{ error() }}</span></div>

      <ng-container *ngIf="!loading()">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-wrap">
            <i class="pi pi-search"></i>
            <input [(ngModel)]="search" placeholder="Buscar profesor..." class="search-input" />
          </div>
          <div class="toolbar-actions">
            <button class="btn-light" (click)="downloadTemplate()">
              <i class="pi pi-download"></i> Descargar plantilla
            </button>
            <button class="btn-light" (click)="bulkInput.click()" [disabled]="programs().length === 0">
              <i class="pi pi-upload"></i> Cargar Excel
            </button>
            <input #bulkInput type="file" accept=".xlsx" hidden (change)="onBulkFile($event)" />
            <button class="btn-new" (click)="openForm()">
              <i class="pi pi-plus"></i> Nuevo profesor
            </button>
          </div>
        </div>

        <div class="empty-state" *ngIf="filtered().length === 0">
          <div class="empty-icon"><i class="pi pi-users"></i></div>
          <div class="empty-title">No hay usuarios registrados</div>
          <div class="empty-desc">Crea el primer profesor con el botón "Nuevo profesor".</div>
        </div>

        <div class="table-card" *ngIf="filtered().length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Código</th>
                <th>Correo</th>
                <th>Programa</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filtered()">
                <td>
                  <div class="user-cell">
                    <div class="u-av">{{ initials(u) }}</div>
                    <span class="u-name">{{ u.name }}</span>
                  </div>
                </td>
                <td class="code-cell">{{ u.document_number }}</td>
                <td class="email-cell">{{ u.email }}</td>
                <td><span class="prog-tag">{{ programName(u.program_id) }}</span></td>
                <td><span class="role-tag">{{ roleName(u.role_id) }}</span></td>
                <td><span class="status-badge" [class]="u.active ? 'open' : 'expired'">{{ u.active ? 'Activo' : 'Inactivo' }}</span></td>
                <td>
                  <button class="btn-icon" title="Editar profesor" (click)="openEdit(u)">
                    <i class="pi pi-pencil"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- Modal Nuevo profesor -->
      <div class="modal-overlay" *ngIf="showForm()" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editing() ? 'Editar profesor' : 'Nuevo profesor' }}</h2>
            <button class="modal-close" (click)="closeForm()"><i class="pi pi-times"></i></button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-field span-2">
                <label>Nombre completo</label>
                <input [(ngModel)]="form.name" class="fc" placeholder="Juliana Ramírez" />
              </div>
              <div class="form-field">
                <label>Documento</label>
                <input [(ngModel)]="form.document_number" class="fc" placeholder="1098765432" />
              </div>
              <div class="form-field">
                <label>Correo institucional</label>
                <input [(ngModel)]="form.email" type="email" class="fc" placeholder="jramirez@unab.edu.co" />
              </div>
              <div class="form-field">
                <label>Contraseña</label>
                <input [(ngModel)]="form.password" type="password" class="fc" [placeholder]="editing() ? 'Dejar vacía para conservarla' : 'Mínimo 8 caracteres'" />
              </div>
              <div class="form-field">
                <label>Rol</label>
                <input class="fc fc-locked" value="Profesor" readonly />
                <span class="field-hint">Los usuarios creados aquí se registran siempre con el rol Profesor.</span>
              </div>
              <!-- Campo Programa -->
              <div class="form-field span-2">
                <label>Programa académico <span class="req">*</span></label>
                <select [(ngModel)]="form.program_id" class="fc">
                  <option value="" disabled>Selecciona el programa del profesor</option>
                  <option *ngFor="let c of programs()" [ngValue]="c.id">{{ c.name }} ({{ c.id }})</option>
                </select>
                <span class="field-hint">Identifica a qué programa pertenece este profesor.</span>
              </div>
              <div class="form-field span-2">
                <label class="check-row">
                  <input type="checkbox" [(ngModel)]="form.active" />
                  <span>Profesor activo</span>
                </label>
              </div>
            </div>

            <div class="form-error" *ngIf="formError()">
              <i class="pi pi-exclamation-circle"></i> {{ formError() }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeForm()">Cancelar</button>
            <button class="btn-save" (click)="save()" [disabled]="saving()">
              <i class="pi pi-spin pi-spinner" *ngIf="saving()"></i>
              {{ saving() ? 'Guardando...' : (editing() ? 'Guardar cambios' : 'Crear profesor') }}
            </button>
          </div>
        </div>
      </div>

      <app-bulk-result-dialog
        title="Resultado cargue masivo de profesores"
        [(visible)]="bulkVisible"
        [summary]="bulkSummary">
      </app-bulk-result-dialog>
    </div>
  `,
  styles: [`
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }
    .empty-state { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 48px; text-align: center; }
    .empty-icon { font-size: 40px; color: var(--border); margin-bottom: 12px; }
    .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .toolbar-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-wrap i { position: absolute; left: 12px; color: var(--text-light); font-size: 13px; }
    .search-input { width: 260px; padding: 10px 14px 10px 34px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 14px; color: var(--text); font-family: inherit; }
    .search-input:focus { outline: none; border-color: var(--primary); }
    .btn-new {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;
      background: var(--primary); color: #1A1A2E; border: none; border-radius: var(--radius-sm);
      font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s;
    }
    .btn-new:hover { background: var(--primary-dark); }
    .btn-light {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px;
      background: #fff; color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm);
      font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: border-color 0.15s, background 0.15s;
    }
    .btn-light:hover:not(:disabled) { background: var(--surface-2); border-color: var(--primary); }
    .btn-light:disabled { opacity: .55; cursor: not-allowed; }

    .table-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--surface-2); border-bottom: 1px solid var(--border); }
    .data-table tbody td { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover td { background: #F9FAFB; }
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .u-av { width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
    .u-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .code-cell { font-size: 12px; color: var(--accent); font-weight: 600; }
    .email-cell { font-size: 12px; color: var(--text-muted); }
    .prog-tag { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 4px; color: var(--accent); background: rgba(124,58,237,0.08); }
    .role-tag { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 4px; color: var(--primary); background: rgba(255,165,2,0.1); }
    .status-badge { display: inline-flex; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-badge.open { background: var(--badge-open-bg); color: var(--badge-open); }
    .status-badge.expired { background: var(--badge-expired-bg); color: var(--badge-expired); }
    .btn-icon { width: 32px; height: 32px; border: none; border-radius: var(--radius-sm); background: transparent; color: var(--primary); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
    .btn-icon:hover { background: rgba(255,165,2,0.12); color: var(--primary-dark); }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 500;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal {
      background: #fff; border-radius: var(--radius-lg); width: 100%; max-width: 560px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { font-size: 18px; font-weight: 800; color: var(--text); }
    .modal-close { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 16px; padding: 4px; }
    .modal-close:hover { color: var(--text); }
    .modal-body { padding: 24px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field.span-2 { grid-column: span 2; }
    .form-field label { font-size: 13px; font-weight: 600; color: var(--text); }
    .req { color: var(--n1-color); }
    .fc {
      padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm);
      font-size: 14px; color: var(--text); font-family: inherit; background: #fff;
    }
    .fc:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255,165,2,0.12); }
    .fc-locked { background: var(--surface-2); color: var(--text-muted); cursor: not-allowed; font-weight: 600; }
    .field-hint { font-size: 12px; color: var(--text-muted); }
    .check-row { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text); }
    .check-row input { width: auto; }
    .form-error {
      display: flex; align-items: center; gap: 8px; margin-top: 16px;
      background: var(--n1-bg); border: 1px solid #FECACA; color: var(--n1-color);
      border-radius: var(--radius-sm); padding: 10px 14px; font-size: 13px;
    }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border); }
    .btn-cancel {
      padding: 10px 20px; border: 1px solid var(--border); background: #fff; color: var(--text);
      border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
    }
    .btn-cancel:hover { border-color: var(--text-muted); }
    .btn-save {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 22px;
      background: var(--primary); color: #1A1A2E; border: none; border-radius: var(--radius-sm);
      font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s;
    }
    .btn-save:hover:not(:disabled) { background: var(--primary-dark); }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class ProfesoresComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  search  = '';
  users   = signal<User[]>([]);
  roles   = signal<Role[]>([]);
  programs = signal<Program[]>([]);

  showForm  = signal(false);
  editing   = signal(false);
  editId    = signal<number | null>(null);
  saving    = signal(false);
  formError = signal('');
  bulkVisible = false;
  bulkSummary: BulkImportSummary = { success: [], skipped: [], errors: [] };
  form: ProfesorForm = this.emptyForm();

  constructor(
    private userApi: UserApiService,
    private bulkExcel: BulkExcelService,
  ) {}

  ngOnInit() {
    // Carga best-effort: los endpoints de User_MS requieren JWT, por lo que en
    // modo demo pueden fallar. Cada llamada se resuelve por separado para que
    // un fallo parcial no bloquee toda la vista.
    let pending = 3;
    const done = () => { if (--pending === 0) this.loading.set(false); };

    this.userApi.getUsers().subscribe({
      next: (u) => { this.users.set(u ?? []); done(); },
      error: () => { this.showConnHint(); done(); },
    });
    this.userApi.getRoles().subscribe({
      next: (r) => { this.roles.set(r ?? []); done(); },
      error: () => { this.showConnHint(); done(); },
    });
    this.userApi.getPrograms().subscribe({
      next: (c) => { this.programs.set(c ?? []); done(); },
      error: () => { this.showConnHint(); done(); },
    });
  }

  private showConnHint() {
    this.error.set('Algunos catálogos requieren una sesión autenticada. Inicia sesión con tus credenciales para ver y gestionar usuarios.');
  }

  private emptyForm(): ProfesorForm {
    return { name: '', document_number: '', email: '', password: '', role_id: 0, program_id: '', active: true };
  }

  downloadTemplate(): void {
    this.bulkExcel.downloadTemplate(
      'plantilla_profesores.xlsx',
      ['document_number', 'name', 'email', 'password', 'program_id', 'active'],
      'Profesores',
    );
  }

  async onBulkFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const summary: BulkImportSummary = { success: [], skipped: [], errors: [] };
    const role = this.roles().find(r => this.isTeacherRole(r));
    if (!role) {
      summary.errors.push({ row: 0, label: file.name, detail: 'No existe un rol Profesor configurado.' });
      this.bulkSummary = summary;
      this.bulkVisible = true;
      return;
    }

    try {
      const rows = await this.bulkExcel.readRows(file);
      const activePrograms = new Map(this.programs().filter(p => p.active).map(p => [p.id.toUpperCase(), p]));
      const existingDocs = new Set(this.users().map(u => String(u.document_number).trim()));
      const existingEmails = new Set(this.users().map(u => String(u.email ?? '').trim().toLowerCase()).filter(Boolean));
      const seenDocs = new Set<string>();
      const seenEmails = new Set<string>();

      for (let index = 0; index < rows.length; index++) {
        const rowNumber = index + 2;
        const documentNumber = this.bulkExcel.value(rows[index], 'document_number');
        const name = this.bulkExcel.value(rows[index], 'name');
        const email = this.bulkExcel.value(rows[index], 'email').toLowerCase();
        const password = this.bulkExcel.value(rows[index], 'password');
        const programId = this.bulkExcel.value(rows[index], 'program_id').toUpperCase();
        const active = this.bulkExcel.boolValue(rows[index], 'active', true);
        const label = documentNumber || `Fila ${rowNumber}`;

        if (!documentNumber) {
          summary.errors.push({ row: rowNumber, label, detail: 'El documento es requerido.' });
          continue;
        }
        if (!name || name.length > 255) {
          summary.errors.push({ row: rowNumber, label, detail: 'El nombre es requerido y debe tener máximo 255 caracteres.' });
          continue;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          summary.errors.push({ row: rowNumber, label, detail: 'El correo no tiene un formato válido.' });
          continue;
        }
        if (password.length < 8) {
          summary.errors.push({ row: rowNumber, label, detail: 'La contraseña debe tener al menos 8 caracteres.' });
          continue;
        }
        if (!activePrograms.has(programId)) {
          summary.errors.push({ row: rowNumber, label, detail: 'El programa indicado no existe o está inactivo.' });
          continue;
        }
        if (existingDocs.has(documentNumber) || existingEmails.has(email)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Ya existe un usuario con ese documento o correo.' });
          continue;
        }
        if (seenDocs.has(documentNumber) || seenEmails.has(email)) {
          summary.skipped.push({ row: rowNumber, label, detail: 'Registro repetido dentro del archivo.' });
          continue;
        }

        seenDocs.add(documentNumber);
        seenEmails.add(email);
        try {
          const saved = await firstValueFrom(this.userApi.createUser({
            document_number: documentNumber,
            name,
            email,
            password,
            role_id: role.id,
            program_id: programId,
            active,
          } as UserCreate));
          this.users.set([...this.users(), saved]);
          existingDocs.add(documentNumber);
          existingEmails.add(email);
          summary.success.push({ row: rowNumber, label: documentNumber, detail: name });
        } catch (err) {
          summary.errors.push({ row: rowNumber, label: documentNumber, detail: this.errorText(err) });
        }
      }
    } catch (err) {
      summary.errors.push({ row: 0, label: file.name, detail: this.errorText(err) });
    }

    this.bulkSummary = summary;
    this.bulkVisible = true;
  }

  openForm() {
    this.form = this.emptyForm();
    this.editing.set(false);
    this.editId.set(null);
    const profesor = this.roles().find(r => this.isTeacherRole(r));
    if (!profesor) {
      this.formError.set('No existe un rol de profesor en el sistema. Pide al administrador que lo cree antes de registrar profesores.');
      this.showForm.set(false);
      return;
    }
    this.form.role_id = profesor.id;
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(user: User) {
    this.editing.set(true);
    this.editId.set(user.id);
    this.form = {
      name: user.name,
      document_number: user.document_number,
      email: user.email ?? '',
      password: '',
      role_id: user.role_id,
      program_id: user.program_id ?? '',
      active: user.active,
    };
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  save() {
    if (!this.form.name || !this.form.email || !this.form.document_number) {
      this.formError.set('Completa nombre, documento y correo.');
      return;
    }
    if (!this.form.role_id) { this.formError.set('Selecciona un rol.'); return; }
    if (!this.form.program_id) { this.formError.set('Selecciona el programa académico del profesor.'); return; }
    if (!this.editing() && this.form.password.length < 8) { this.formError.set('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (this.editing() && this.form.password && this.form.password.length < 8) { this.formError.set('La contraseña debe tener al menos 8 caracteres.'); return; }

    this.saving.set(true);
    this.formError.set('');
    const payload: Partial<UserCreate> & { active?: boolean } = {
      document_number: this.form.document_number,
      name: this.form.name,
      email: this.form.email,
      role_id: this.form.role_id,
      program_id: this.form.program_id,
      active: this.form.active,
    };
    if (this.form.password) payload.password = this.form.password;

    const id = this.editId();
    const request = this.editing() && id != null
      ? this.userApi.updateUser(id, payload)
      : this.userApi.createUser(payload as UserCreate);

    request.subscribe({
      next: (saved) => {
        this.users.set(this.editing()
          ? this.users().map(u => u.id === saved.id ? saved : u)
          : [...this.users(), saved]);
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.detail ?? 'No se pudo guardar el profesor. Revisa los datos e inténtalo de nuevo.');
      },
    });
  }
  filtered() {
    const q = this.search.toLowerCase().trim();
    const teachers = this.users().filter(u => this.isTeacherRoleId(u.role_id));
    if (!q) return teachers;
    return teachers.filter(u =>
      u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
    );
  }

  initials(u: User) { return (u.name?.[0] ?? '').toUpperCase(); }
  roleName(id: number) { return this.roles().find(r => r.id === id)?.name ?? '-'; }
  programName(id: string | null) { return this.programs().find(c => c.id === id)?.name ?? '-'; }

  private isTeacherRole(role: Role): boolean {
    return role.name.trim().toLowerCase().startsWith('profesor');
  }

  private isTeacherRoleId(roleId: number): boolean {
    const role = this.roles().find(r => r.id === roleId);
    return role ? this.isTeacherRole(role) : false;
  }

  private errorText(err: unknown): string {
    const http = err as { status?: number; error?: { detail?: unknown } };
    if (http?.status === 503) return 'Servicio no disponible, intenta en unos segundos';
    if (http?.status === 404) return 'No encontrado';
    return typeof http?.error?.detail === 'string' ? http.error.detail : 'Ocurrió un error inesperado';
  }
}
