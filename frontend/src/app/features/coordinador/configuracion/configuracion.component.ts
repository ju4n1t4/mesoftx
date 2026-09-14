import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserApiService } from '../../../core/services/user-api.service';
import { Period } from '../../../core/models/abet.models';

/**
 * Configuración general del coordinador. En el modelo v13 esta pantalla quedó
 * reducida: los periodos son el único parámetro que gestiona aquí (con su
 * pantalla dedicada en /coordinador/periodos), y las integraciones son
 * informativas. La gestión de usuarios y perfiles vive en el módulo /admin.
 */
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

          <div class="inline-form" *ngIf="showPeriodForm()">
            <input class="mini-input" [(ngModel)]="newPeriodCode" placeholder="Código (202610)" />
            <button class="save-mini" (click)="addPeriod()">Guardar</button>
            <button class="cancel-mini" (click)="cancelPeriod()">Cancelar</button>
          </div>

          <div class="row" *ngFor="let p of periods()">
            <div class="row-title">{{ p.code }}</div>
          </div>
          <div class="empty-inline" *ngIf="periods().length === 0 && !showPeriodForm()">Sin periodos registrados.</div>
        </div>

        <!-- Integraciones -->
        <div class="config-card">
          <div class="cc-header"><i class="pi pi-check-circle cc-icon"></i><h2>Integraciones</h2></div>
          <div class="int-row">
            <span class="int-name">Base de datos PostgreSQL</span>
            <span class="int-status connected">Operativo</span>
          </div>
          <div class="int-row">
            <span class="int-name">Microservicio de usuarios (User_MS)</span>
            <span class="int-status connected">Operativo</span>
          </div>
          <div class="int-row">
            <span class="int-name">Microservicio de valoración (Assesment_MS)</span>
            <span class="int-status connected">Operativo</span>
          </div>
        </div>

        <!-- Gestión de usuarios: vive en /admin -->
        <div class="config-card">
          <div class="cc-header"><i class="pi pi-users cc-icon"></i><h2>Usuarios y perfiles</h2></div>
          <p class="info-text">
            La creación de usuarios y perfiles y la asignación de permisos se gestionan
            desde el módulo de administración (<code>/admin</code>). El coordinador registra
            profesores desde la pantalla “Profesores”.
          </p>
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

    .add-btn { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--accent); background: rgba(124,58,237,0.08); border: none; border-radius: var(--radius-sm); padding: 6px 12px; cursor: pointer; font-family: inherit; }
    .add-btn:hover { background: rgba(124,58,237,0.16); }
    .add-btn i { font-size: 11px; }

    .inline-form { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; padding: 12px; background: var(--surface-2); border-radius: var(--radius-sm); }
    .mini-input { flex: 1; min-width: 120px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; font-family: inherit; color: var(--text); }
    .mini-input:focus { outline: none; border-color: var(--primary); }
    .save-mini { background: var(--primary); color: #1A1A2E; border: none; border-radius: var(--radius-sm); padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .save-mini:hover { background: var(--primary-dark); }
    .cancel-mini { background: #fff; color: var(--text-muted); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }

    .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .row:last-child { border-bottom: none; }
    .row-title { font-size: 14px; font-weight: 600; color: var(--text); }

    .int-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .int-row:last-child { border-bottom: none; }
    .int-name { font-size: 13px; color: var(--text); font-weight: 500; }
    .int-status { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .int-status.connected { background: var(--badge-open-bg); color: var(--badge-open); }

    .info-text { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
    .info-text code { background: var(--surface-2); padding: 1px 6px; border-radius: 4px; }
    .empty-inline { font-size: 13px; color: var(--text-muted); padding: 8px 0; }
  `]
})
export class ConfiguracionComponent implements OnInit {
  loading = signal(true);
  error   = signal('');
  periods = signal<Period[]>([]);

  showPeriodForm = signal(false);
  newPeriodCode = '';

  constructor(private userApi: UserApiService) {}

  ngOnInit() {
    this.userApi.getPeriods().subscribe({
      next: (p) => { this.periods.set(p ?? []); this.loading.set(false); },
      error: (e: HttpErrorResponse) => {
        this.error.set(e.status === 401
          ? 'El catálogo de periodos requiere una sesión autenticada.'
          : (typeof e.error?.detail === 'string' ? e.error.detail : 'No se pudieron cargar los periodos.'));
        this.loading.set(false);
      },
    });
  }

  addPeriod() {
    const code = this.newPeriodCode.trim();
    if (!code) return;
    this.userApi.createPeriod({ code }).subscribe({
      next: (p) => { this.periods.set([...this.periods(), p]); this.cancelPeriod(); },
      error: (e: HttpErrorResponse) => this.error.set(
        typeof e.error?.detail === 'string' ? e.error.detail : 'No se pudo crear el período.'),
    });
  }
  cancelPeriod() { this.showPeriodForm.set(false); this.newPeriodCode = ''; }
}
