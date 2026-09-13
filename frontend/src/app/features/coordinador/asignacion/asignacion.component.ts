import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AccessControlService, APP_MODULES, SYSTEM_ROLES, AppModule,
} from '../../../core/services/access-control.service';

@Component({
  selector: 'app-asignacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Asignación de accesos</h1>
        <p>Define a qué opciones de la plataforma puede acceder cada perfil. Selecciona un perfil y activa o desactiva los módulos permitidos.</p>
      </div>

      <div class="asg-layout">
        <!-- Selector de perfil -->
        <div class="role-panel">
          <div class="rp-label">PERFIL</div>
          <button *ngFor="let r of roles"
                  class="role-item"
                  [class.active]="selectedRole() === r"
                  (click)="selectedRole.set(r)">
            <span class="ri-avatar">{{ r[0] }}</span>
            <div class="ri-info">
              <span class="ri-name">{{ r }}</span>
              <span class="ri-count">{{ grantedCount(r) }} de {{ modules.length }} accesos</span>
            </div>
            <i class="pi pi-chevron-right ri-chev"></i>
          </button>
        </div>

        <!-- Matriz de módulos del perfil seleccionado -->
        <div class="modules-panel">
          <div class="mp-head">
            <div>
              <div class="mp-title">Accesos de {{ selectedRole() }}</div>
              <div class="mp-sub">Marca las opciones que este perfil podrá ver y usar.</div>
            </div>
            <div class="mp-actions">
              <button class="link-btn" (click)="setAll(true)">Seleccionar todo</button>
              <span class="sep">·</span>
              <button class="link-btn" (click)="setAll(false)">Quitar todo</button>
            </div>
          </div>

          <div class="module-list">
            <label class="module-row" *ngFor="let m of modules">
              <div class="mr-info">
                <span class="mr-label">{{ m.label }}</span>
                <span class="mr-desc">{{ m.description }}</span>
              </div>
              <span class="switch" [class.on]="isOn(m.key)">
                <input type="checkbox"
                       [checked]="isOn(m.key)"
                       (change)="onToggle(m, $any($event.target).checked)" />
                <span class="knob"></span>
              </span>
            </label>
          </div>

          <div class="mp-footer">
            <div class="save-hint" [class.show]="savedMsg()">
              <i class="pi pi-check-circle"></i> {{ savedMsg() }}
            </div>
            <button class="btn-reset" (click)="resetDefaults()">
              <i class="pi pi-refresh"></i> Restaurar valores por defecto
            </button>
          </div>
        </div>
      </div>

      <div class="notice">
        <i class="pi pi-info-circle"></i>
        <span>Los accesos se aplican sobre la navegación de la plataforma y se guardan en este equipo. La autorización definitiva de cada operación la valida el servidor según el rol del usuario.</span>
      </div>
    </div>
  `,
  styles: [`
    .asg-layout { display: grid; grid-template-columns: 280px 1fr; gap: 16px; align-items: start; }

    .role-panel { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .rp-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.08em; padding: 6px 8px; }
    .role-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      border: 1px solid transparent; border-radius: var(--radius-sm); background: none;
      cursor: pointer; font-family: inherit; text-align: left; transition: all 0.15s; width: 100%;
    }
    .role-item:hover { background: var(--surface-2); }
    .role-item.active { background: rgba(124,58,237,0.06); border-color: rgba(124,58,237,0.3); }
    .ri-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
    .ri-info { flex: 1; display: flex; flex-direction: column; }
    .ri-name { font-size: 14px; font-weight: 700; color: var(--text); }
    .ri-count { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
    .ri-chev { font-size: 11px; color: var(--text-light); }
    .role-item.active .ri-chev { color: var(--accent); }

    .modules-panel { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; }
    .mp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .mp-title { font-size: 15px; font-weight: 800; color: var(--text); }
    .mp-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .mp-actions { flex-shrink: 0; display: flex; align-items: center; gap: 8px; }
    .link-btn { background: none; border: none; color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 0; }
    .link-btn:hover { text-decoration: underline; }
    .sep { color: var(--text-light); font-size: 12px; }

    .module-list { padding: 6px 20px; }
    .module-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
    .module-row:last-child { border-bottom: none; }
    .mr-info { display: flex; flex-direction: column; }
    .mr-label { font-size: 14px; font-weight: 600; color: var(--text); }
    .mr-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    .switch { position: relative; width: 42px; height: 24px; border-radius: 20px; background: var(--border); flex-shrink: 0; transition: background 0.15s; }
    .switch.on { background: var(--badge-open); }
    .switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
    .knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .switch.on .knob { transform: translateX(18px); }

    .mp-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-top: 1px solid var(--border); background: var(--surface-2); }
    .save-hint { font-size: 13px; font-weight: 600; color: var(--badge-open); display: inline-flex; align-items: center; gap: 6px; opacity: 0; transition: opacity 0.2s; }
    .save-hint.show { opacity: 1; }
    .btn-reset { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 14px; font-size: 13px; font-weight: 600; color: var(--text-muted); cursor: pointer; font-family: inherit; }
    .btn-reset:hover { border-color: var(--text-muted); color: var(--text); }

    .notice { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-top: 16px; font-size: 13px; color: var(--text-muted); line-height: 1.5; }
    .notice i { color: var(--primary); flex-shrink: 0; margin-top: 2px; }
  `]
})
export class AsignacionComponent {
  roles    = [...SYSTEM_ROLES];
  modules  = APP_MODULES;
  selectedRole = signal<string>(SYSTEM_ROLES[0]);
  savedMsg = signal('');
  private msgTimer?: ReturnType<typeof setTimeout>;

  constructor(private access: AccessControlService) {}

  isOn(moduleKey: string): boolean {
    return this.access.canAccess(this.selectedRole(), moduleKey);
  }

  grantedCount(role: string): number {
    const row = this.access.matrix()[role] ?? {};
    return this.modules.filter(m => row[m.key]).length;
  }

  onToggle(m: AppModule, value: boolean) {
    this.access.toggle(this.selectedRole(), m.key, value);
    this.flash(`Acceso a "${m.label}" ${value ? 'habilitado' : 'deshabilitado'} para ${this.selectedRole()}.`);
  }

  setAll(value: boolean) {
    for (const m of this.modules) this.access.toggle(this.selectedRole(), m.key, value);
    this.flash(value ? 'Todos los accesos habilitados.' : 'Todos los accesos deshabilitados.');
  }

  resetDefaults() {
    this.access.reset();
    this.flash('Valores por defecto restaurados.');
  }

  private flash(msg: string) {
    this.savedMsg.set(msg);
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.savedMsg.set(''), 2500);
  }
}
