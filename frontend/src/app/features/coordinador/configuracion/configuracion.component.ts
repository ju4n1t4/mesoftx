import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserApiService } from '../../../core/services/user-api.service';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { AcademicPeriod, User, Role, PerformanceEvaluation, Career } from '../../../core/models/abet.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Configuración del sistema</h1>
        <p>Parámetros generales de la plataforma MESOFTX.</p>
      </div>

      <div class="state-box" *ngIf="loading()"><i class="pi pi-spin pi-spinner"></i> Cargando…</div>
      <div class="notice" *ngIf="error()"><i class="pi pi-info-circle"></i> <span>{{ error() }}</span></div>

      <div class="config-grid" *ngIf="!loading()">

        <!-- Periodos -->
        <div class="config-card">
          <div class="cc-header">
            <i class="pi pi-calendar cc-icon"></i><h2>Periodos académicos</h2>
            <button class="add-btn" (click)="showPeriodForm.set(!showPeriodForm())">
              <i class="pi pi-plus"></i> Agregar
            </button>
          </div>

          <!-- Form nuevo periodo -->
          <div class="inline-form" *ngIf="showPeriodForm()">
            <input class="mini-input" [(ngModel)]="newPeriodCode" placeholder="Código (202610)" />
            <input class="mini-input" [(ngModel)]="newPeriodName" placeholder="Nombre" />
            <button class="save-mini" (click)="addPeriod()">Guardar</button>
            <button class="cancel-mini" (click)="cancelPeriod()">Cancelar</button>
          </div>

          <div class="row" *ngFor="let p of periods()">
            <div>
              <div class="row-title">{{ p.code }}</div>
              <div class="row-sub">{{ p.name }}</div>
            </div>
            <button class="icon-btn" title="Editar"><i class="pi pi-pencil"></i></button>
          </div>
          <div class="empty-inline" *ngIf="periods().length === 0 && !showPeriodForm()">Sin periodos registrados.</div>
        </div>

        <!-- Niveles de logro -->
        <div class="config-card">
          <div class="cc-header">
            <i class="pi pi-star cc-icon"></i><h2>Niveles de logro</h2>
            <button class="add-btn" (click)="showLevelForm.set(!showLevelForm())">
              <i class="pi pi-plus"></i> Agregar
            </button>
          </div>

          <div class="inline-form" *ngIf="showLevelForm()">
            <input class="mini-input" [(ngModel)]="newLevelValue" placeholder="Nivel (N1, N2…)" />
            <button class="save-mini" (click)="addLevel()">Guardar</button>
            <button class="cancel-mini" (click)="cancelLevel()">Cancelar</button>
          </div>

          <div class="row" *ngFor="let lv of levels()">
            <span class="row-title">{{ lv.evaluation_value }}</span>
            <button class="icon-btn" title="Editar"><i class="pi pi-pencil"></i></button>
          </div>
          <div class="empty-inline" *ngIf="levels().length === 0 && !showLevelForm()">Sin niveles de logro registrados.</div>
        </div>

        <!-- Integraciones -->
        <div class="config-card">
          <div class="cc-header"><i class="pi pi-check-circle cc-icon"></i><h2>Integraciones</h2></div>
          <div class="int-row">
            <span class="int-name">Base de datos PostgreSQL</span>
            <div class="int-actions">
              <span class="int-status connected">Operativo</span>
              <button class="config-btn">Configurar</button>
            </div>
          </div>
          <div class="int-row">
            <span class="int-name">Power BI</span>
            <div class="int-actions">
              <span class="int-status pending">No configurado</span>
              <button class="config-btn">Configurar</button>
            </div>
          </div>
        </div>

        <!-- Usuarios -->
        <div class="config-card">
          <div class="cc-header">
            <i class="pi pi-users cc-icon"></i><h2>Usuarios y roles</h2>
            <button class="add-btn" (click)="showUserForm.set(!showUserForm())">
              <i class="pi pi-plus"></i> Agregar
            </button>
          </div>

          <div class="user-form-box" *ngIf="showUserForm()">
            <div class="uf-row">
              <input class="uf-input" [(ngModel)]="newUserName" placeholder="Nombre" />
              <input class="uf-input" [(ngModel)]="newUserEmail" placeholder="Correo institucional" />
            </div>
            <div class="uf-row">
              <select class="uf-input uf-select-wide" [(ngModel)]="newUserCareerId">
                <option [ngValue]="null">Programa académico</option>
                <option *ngFor="let c of careers()" [ngValue]="c.id">{{ c.name }}</option>
              </select>
              <select class="uf-input uf-select" [(ngModel)]="newUserRoleId">
                <option [ngValue]="null">Rol</option>
                <option *ngFor="let r of roles()" [ngValue]="r.id">{{ r.name }}</option>
              </select>
              <button class="uf-save" (click)="addUser()" [disabled]="savingUser()">
                <i class="pi pi-spin pi-spinner" *ngIf="savingUser()"></i>
                {{ savingUser() ? 'Guardando…' : 'Guardar' }}
              </button>
              <button class="uf-cancel" (click)="cancelUser()">Cancelar</button>
            </div>
            <div class="form-error" *ngIf="userFormError()">{{ userFormError() }}</div>
          </div>

          <div class="user-row" *ngFor="let u of users()">
            <div class="u-av">{{ initials(u) }}</div>
            <div class="u-info">
              <span class="u-name">{{ u.name }} {{ u.surname }}</span>
              <span class="u-career">{{ careerName(u.career_id) }}</span>
            </div>
            <span class="u-role">{{ roleName(u.role_id) }}</span>
            <button class="icon-btn" title="Editar"><i class="pi pi-pencil"></i></button>
          </div>
          <div class="empty-inline" *ngIf="users().length === 0 && !showUserForm()">Sin usuarios registrados.</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .state-box { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; }
    .state-box i { margin-right: 6px; }
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }

    .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .config-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; }
    .cc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
    .cc-header h2 { font-size: 15px; font-weight: 700; color: var(--text); }
    .cc-icon { color: var(--accent); font-size: 15px; }

    .add-btn {
      margin-left: auto; display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; font-weight: 600; color: var(--accent);
      background: rgba(124,58,237,0.08); border: none; border-radius: var(--radius-sm);
      padding: 6px 12px; cursor: pointer; font-family: inherit; transition: background 0.15s;
    }
    .add-btn:hover { background: rgba(124,58,237,0.16); }
    .add-btn i { font-size: 11px; }

    .inline-form {
      display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;
      padding: 12px; background: var(--surface-2); border-radius: var(--radius-sm);
    }
    .mini-input {
      flex: 1; min-width: 120px; padding: 8px 10px; border: 1px solid var(--border);
      border-radius: var(--radius-sm); font-size: 13px; font-family: inherit; color: var(--text);
    }
    .mini-input:focus { outline: none; border-color: var(--primary); }
    .mini-select { background: #fff; cursor: pointer; max-width: 140px; }
    .save-mini {
      background: var(--primary); color: #1A1A2E; border: none; border-radius: var(--radius-sm);
      padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .save-mini:hover { background: var(--primary-dark); }
    .cancel-mini {
      background: #fff; color: var(--text-muted); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 8px 14px; font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit;
    }
    .cancel-mini:hover { border-color: var(--text-muted); color: var(--text); }

    .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .row:last-child { border-bottom: none; }
    .row-title { font-size: 14px; font-weight: 600; color: var(--text); }
    .row-sub { font-size: 12px; color: var(--text-muted); margin-top: 1px; }

    .int-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .int-row:last-child { border-bottom: none; }
    .int-name { font-size: 13px; color: var(--text); font-weight: 500; }
    .int-actions { display: flex; align-items: center; gap: 10px; }
    .int-status { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .int-status.connected { background: var(--badge-open-bg); color: var(--badge-open); }
    .int-status.pending { background: var(--badge-draft-bg); color: var(--badge-draft); }
    .config-btn {
      font-size: 12px; font-weight: 600; color: var(--text-muted);
      background: none; border: 1px solid var(--border); border-radius: var(--radius-sm);
      padding: 5px 12px; cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .config-btn:hover { border-color: var(--primary); color: var(--primary); }

    /* Formulario de usuario horizontal (Nombre · Correo · Rol) */
    .user-form-box {
      background: var(--surface-2); border-radius: var(--radius-sm);
      padding: 12px; margin-bottom: 14px;
    }
    .uf-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .uf-input {
      flex: 1; min-width: 120px; padding: 9px 12px; border: 1px solid var(--border);
      border-radius: var(--radius-sm); font-size: 13px; font-family: inherit; color: var(--text);
      background: #fff;
    }
    .uf-input:focus { outline: none; border-color: var(--primary); }
    .uf-select { flex: 0 0 120px; min-width: 100px; cursor: pointer; }
    .uf-select-wide { flex: 1; min-width: 160px; cursor: pointer; background: #fff; }
    .uf-row + .uf-row { margin-top: 8px; }
    .uf-save {
      background: var(--primary); color: #1A1A2E; border: none; border-radius: var(--radius-sm);
      padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
      display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
    }
    .uf-save:hover:not(:disabled) { background: var(--primary-dark); }
    .uf-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .uf-cancel {
      background: #fff; color: var(--text-muted); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 9px 16px; font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit; white-space: nowrap;
    }
    .uf-cancel:hover { border-color: var(--text-muted); color: var(--text); }
    .form-error { font-size: 12px; color: var(--badge-expired); margin-top: 8px; }

    .user-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .user-row:last-child { border-bottom: none; }
    .u-av { width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; }
    .u-info { flex: 1; display: flex; flex-direction: column; }
    .u-name { font-size: 13px; font-weight: 500; color: var(--text); }
    .u-career { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
    .u-role { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 4px; color: var(--accent); background: rgba(124,58,237,0.1); }

    .icon-btn { background: none; border: none; color: var(--text-light); cursor: pointer; font-size: 13px; padding: 5px; border-radius: 4px; transition: all 0.15s; }
    .icon-btn:hover { background: var(--surface-2); color: var(--text); }

    .empty-inline { font-size: 13px; color: var(--text-muted); padding: 8px 0; }
  `]
})
export class ConfiguracionComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  periods = signal<AcademicPeriod[]>([]);
  levels  = signal<PerformanceEvaluation[]>([]);
  users   = signal<User[]>([]);
  roles   = signal<Role[]>([]);
  careers = signal<Career[]>([]);

  // Estados de formularios
  showPeriodForm = signal(false);
  showLevelForm  = signal(false);
  showUserForm   = signal(false);
  savingUser     = signal(false);
  userFormError  = signal('');

  newPeriodCode = '';
  newPeriodName = '';
  newLevelValue = '';
  newUserName     = '';
  newUserEmail    = '';
  newUserRoleId: number | null = null;
  newUserCareerId: number | null = null;

  constructor(private userApi: UserApiService, private assesment: AssesmentApiService) {}

  ngOnInit() {
    forkJoin({
      periods: this.userApi.getAcademicPeriods(),
      users:   this.userApi.getUsers(),
      roles:   this.userApi.getRoles(),
      careers: this.userApi.getCareers(),
      levels:  this.assesment.getPerformanceEvaluations(),
    }).subscribe({
      next: (r) => {
        this.periods.set(r.periods);
        this.users.set(r.users);
        this.roles.set(r.roles);
        this.careers.set(r.careers);
        this.levels.set(r.levels);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con el servicio. Verifica que los microservicios estén activos.');
        this.loading.set(false);
      },
    });
  }

  // ── Periodos ──
  addPeriod() {
    const code = this.newPeriodCode.trim();
    const name = this.newPeriodName.trim();
    if (!code || !name) return;
    this.userApi.createAcademicPeriod({
      code, name,
      period_id: Number(code.slice(-2)) || 1,
      year_id: Number(code.slice(0, 4)) || new Date().getFullYear(),
    }).subscribe({
      next: (p) => { this.periods.set([...this.periods(), p]); this.cancelPeriod(); },
      error: () => alert('No se pudo crear el período. Verifica la conexión con el backend.'),
    });
  }
  cancelPeriod() { this.showPeriodForm.set(false); this.newPeriodCode = ''; this.newPeriodName = ''; }

  // ── Niveles ──
  addLevel() {
    const value = this.newLevelValue.trim();
    if (!value) return;
    this.assesment.createPerformanceEvaluation({ evaluation_value: value }).subscribe({
      next: (lv) => { this.levels.set([...this.levels(), lv]); this.cancelLevel(); },
      error: () => alert('No se pudo crear el nivel. Verifica la conexión con el backend.'),
    });
  }
  cancelLevel() { this.showLevelForm.set(false); this.newLevelValue = ''; }

  // ── Usuarios ──
  addUser() {
    this.userFormError.set('');
    const fullName = this.newUserName.trim();
    const email    = this.newUserEmail.trim();

    if (!fullName)             { this.userFormError.set('Ingresa el nombre.'); return; }
    if (!email)                { this.userFormError.set('Ingresa el correo institucional.'); return; }
    if (!this.newUserCareerId) { this.userFormError.set('Selecciona el programa académico.'); return; }
    if (!this.newUserRoleId)   { this.userFormError.set('Selecciona un rol.'); return; }

    // Derivar nombre/apellido del campo "Nombre"
    const parts   = fullName.split(/\s+/);
    const name    = parts[0];
    const surname = parts.slice(1).join(' ') || parts[0];

    // Generar código y contraseña temporal automáticos
    const code     = 'USR' + Date.now().toString().slice(-6);
    const password = 'MesoftX' + Math.random().toString(36).slice(-5) + '!';

    this.savingUser.set(true);
    this.userApi.createUser({
      name, surname, code, email, password,
      role_id: this.newUserRoleId,
      career_id: this.newUserCareerId,
      subject_ids: [],
    }).subscribe({
      next: (u) => {
        this.users.set([...this.users(), u]);
        this.savingUser.set(false);
        this.cancelUser();
      },
      error: (e) => {
        this.savingUser.set(false);
        this.userFormError.set(
          e?.error?.detail ?? 'No se pudo crear el usuario. Verifica los datos y la conexión con el backend.',
        );
      },
    });
  }
  cancelUser() {
    this.showUserForm.set(false);
    this.userFormError.set('');
    this.newUserName     = '';
    this.newUserEmail    = '';
    this.newUserRoleId   = null;
    this.newUserCareerId = null;
  }

  initials(u: User) { return `${u.name?.[0] ?? ''}${u.surname?.[0] ?? ''}`.toUpperCase(); }
  roleName(id: number) { return this.roles().find(r => r.id === id)?.name ?? '—'; }
  careerName(id: number) { return this.careers().find(c => c.id === id)?.name ?? '—'; }
}
