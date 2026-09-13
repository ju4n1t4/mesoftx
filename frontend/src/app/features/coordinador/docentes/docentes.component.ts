import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserApiService } from '../../../core/services/user-api.service';
import { User, Role, Career, UserCreate } from '../../../core/models/abet.models';

@Component({
  selector: 'app-docentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Docentes y roles</h1>
        <p>Asigna roles, programa académico y supervisa el avance de valoración de cada docente.</p>
      </div>

      <div class="notice" *ngIf="error()"><i class="pi pi-info-circle"></i> <span>{{ error() }}</span></div>

      <ng-container *ngIf="!loading()">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-wrap">
            <i class="pi pi-search"></i>
            <input [(ngModel)]="search" placeholder="Buscar docente…" class="search-input" />
          </div>
          <button class="btn-new" (click)="openForm()">
            <i class="pi pi-plus"></i> Nuevo docente
          </button>
        </div>

        <div class="empty-state" *ngIf="users().length === 0">
          <div class="empty-icon"><i class="pi pi-users"></i></div>
          <div class="empty-title">No hay usuarios registrados</div>
          <div class="empty-desc">Crea el primer docente con el botón "Nuevo docente".</div>
        </div>

        <div class="table-card" *ngIf="users().length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Código</th>
                <th>Correo</th>
                <th>Programa</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filtered()">
                <td>
                  <div class="user-cell">
                    <div class="u-av">{{ initials(u) }}</div>
                    <span class="u-name">{{ u.name }} {{ u.surname }}</span>
                  </div>
                </td>
                <td class="code-cell">{{ u.code }}</td>
                <td class="email-cell">{{ u.email }}</td>
                <td><span class="prog-tag">{{ careerName(u.career_id) }}</span></td>
                <td><span class="role-tag">{{ roleName(u.role_id) }}</span></td>
                <td><span class="status-badge" [class]="u.active ? 'open' : 'expired'">{{ u.active ? 'Activo' : 'Inactivo' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- ── Modal Nuevo docente ── -->
      <div class="modal-overlay" *ngIf="showForm()" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Nuevo docente</h2>
            <button class="modal-close" (click)="closeForm()"><i class="pi pi-times"></i></button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-field">
                <label>Nombre</label>
                <input [(ngModel)]="form.name" class="fc" placeholder="Juliana" />
              </div>
              <div class="form-field">
                <label>Apellido</label>
                <input [(ngModel)]="form.surname" class="fc" placeholder="Ramírez" />
              </div>
              <div class="form-field">
                <label>Código</label>
                <input [(ngModel)]="form.code" class="fc" placeholder="DOC-001" />
              </div>
              <div class="form-field">
                <label>Correo institucional</label>
                <input [(ngModel)]="form.email" type="email" class="fc" placeholder="jramirez@unab.edu.co" />
              </div>
              <div class="form-field">
                <label>Contraseña</label>
                <input [(ngModel)]="form.password" type="password" class="fc" placeholder="Mínimo 8 caracteres" />
              </div>
              <div class="form-field">
                <label>Rol</label>
                <select [(ngModel)]="form.role_id" class="fc">
                  <option [ngValue]="0" disabled>Selecciona un rol</option>
                  <option *ngFor="let r of roles()" [ngValue]="r.id">{{ r.name }}</option>
                </select>
              </div>
              <!-- ⭐ Campo Programa -->
              <div class="form-field span-2">
                <label>Programa académico <span class="req">*</span></label>
                <select [(ngModel)]="form.career_id" class="fc">
                  <option [ngValue]="0" disabled>Selecciona el programa del docente</option>
                  <option *ngFor="let c of careers()" [ngValue]="c.id">{{ c.name }} ({{ c.code }})</option>
                </select>
                <span class="field-hint">Identifica a qué programa pertenece este profesor.</span>
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
              {{ saving() ? 'Guardando…' : 'Crear docente' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }
    .empty-state { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 48px; text-align: center; }
    .empty-icon { font-size: 40px; color: var(--border); margin-bottom: 12px; }
    .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .empty-desc { font-size: 13px; color: var(--text-muted); }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
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
    .field-hint { font-size: 12px; color: var(--text-muted); }
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
export class DocentesComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  search  = '';
  users   = signal<User[]>([]);
  roles   = signal<Role[]>([]);
  careers = signal<Career[]>([]);

  showForm  = signal(false);
  saving    = signal(false);
  formError = signal('');
  form: UserCreate = this.emptyForm();

  constructor(private userApi: UserApiService) {}

  ngOnInit() {
    // Carga best-effort: los endpoints de User_MS requieren JWT, por lo que en
    // modo demo pueden fallar. Cada llamada se resuelve por separado para que
    // un fallo parcial no bloquee toda la vista.
    let pending = 3;
    const done = () => { if (--pending === 0) this.loading.set(false); };
    let anyFail = false;

    this.userApi.getUsers().subscribe({
      next: (u) => { this.users.set(u ?? []); done(); },
      error: () => { anyFail = true; this.showConnHint(); done(); },
    });
    this.userApi.getRoles().subscribe({
      next: (r) => { this.roles.set(r ?? []); done(); },
      error: () => { anyFail = true; this.showConnHint(); done(); },
    });
    this.userApi.getCareers().subscribe({
      next: (c) => { this.careers.set(c ?? []); done(); },
      error: () => { anyFail = true; this.showConnHint(); done(); },
    });
  }

  private showConnHint() {
    this.error.set('Algunos catálogos requieren una sesión autenticada. Inicia sesión con tus credenciales para ver y gestionar usuarios.');
  }

  private emptyForm(): UserCreate {
    return { name: '', surname: '', code: '', email: '', password: '', role_id: 0, career_id: 0, subject_ids: [] };
  }

  openForm() {
    this.form = this.emptyForm();
    // Preselecciona el rol "Docente" si existe
    const docente = this.roles().find(r => r.name.toLowerCase() === 'docente');
    if (docente) this.form.role_id = docente.id;
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  save() {
    if (!this.form.name || !this.form.surname || !this.form.email || !this.form.code) {
      this.formError.set('Completa nombre, apellido, código y correo.');
      return;
    }
    if (!this.form.role_id) { this.formError.set('Selecciona un rol.'); return; }
    if (!this.form.career_id) { this.formError.set('Selecciona el programa académico del docente.'); return; }
    if (this.form.password.length < 8) { this.formError.set('La contraseña debe tener al menos 8 caracteres.'); return; }

    this.saving.set(true);
    this.formError.set('');
    this.userApi.createUser(this.form).subscribe({
      next: (created) => {
        this.users.set([...this.users(), created]);
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.detail ?? 'No se pudo crear el docente. Revisa los datos e inténtalo de nuevo.');
      },
    });
  }

  filtered() {
    const q = this.search.toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u =>
      `${u.name} ${u.surname}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }

  initials(u: User) { return `${u.name?.[0] ?? ''}${u.surname?.[0] ?? ''}`.toUpperCase(); }
  roleName(id: number) { return this.roles().find(r => r.id === id)?.name ?? '—'; }
  careerName(id: number) { return this.careers().find(c => c.id === id)?.name ?? '—'; }
}
