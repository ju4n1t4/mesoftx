import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { UserApiService } from '../../../core/services/user-api.service';
import {
  StudentOutcome, PerformanceIndicatorDetail, Period, User, Role,
} from '../../../core/models/abet.models';

@Component({
  selector: 'app-student-outcomes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Parametrización de la rúbrica</h1>
        <p>Configura los Student Outcomes, sus identificadores de desempeño (ID) y los descriptores de cada nivel de logro. Esto sustituye la edición manual de la hoja de Excel.</p>
      </div>

      <!-- Banner oscuro -->
      <div class="publish-banner">
        <div class="pb-left">
          <div class="pb-icon"><i class="pi pi-bolt"></i></div>
          <div>
            <div class="pb-title">Lo que publiques aquí es exactamente la rúbrica que verá el docente al valorar.</div>
            <div class="pb-sub">Los cambios se reflejan en el módulo "Registrar valoración" del profesor.</div>
          </div>
        </div>
        <button class="btn-publish" (click)="publish()">Publicar cambios</button>
      </div>

      <!-- Loading / Error -->
      <div class="state-box" *ngIf="loading()">
        <i class="pi pi-spin pi-spinner"></i> <span>Cargando parametrización…</span>
      </div>
      <div class="state-box error" *ngIf="error()">
        <i class="pi pi-exclamation-triangle"></i> <span>{{ error() }}</span>
      </div>

      <ng-container *ngIf="!loading() && !error()">
        <!-- Sin SO -->
        <div class="empty-card" *ngIf="sos().length === 0">
          <i class="pi pi-inbox"></i>
          <div class="empty-title">No hay Student Outcomes registrados</div>
          <div class="empty-desc">Aún no se han creado Student Outcomes en el sistema. Créalos para empezar a parametrizar la rúbrica.</div>
        </div>

        <ng-container *ngIf="sos().length > 0">
          <!-- SO selector -->
          <div class="section-label">STUDENT OUTCOME A CONFIGURAR</div>
          <div class="so-tabs">
            <button *ngFor="let so of sos()" class="so-tab"
                    [class.active]="selectedId() === so.id"
                    (click)="selectedId.set(so.id)">
              {{ so.code }}
            </button>
          </div>

          <!-- Descripción SO -->
          <div class="so-desc-card" *ngIf="selectedSO() as so">
            <div class="so-badge">{{ so.code }}</div>
            <div>
              <div class="so-desc-title">Descripción del Student Outcome</div>
              <div class="so-desc-text">{{ so.description || 'Sin descripción registrada.' }}</div>
            </div>
          </div>

          <!-- Tabla de rúbrica -->
          <div class="rubric-card">
            <table class="rubric-table">
              <thead>
                <tr>
                  <th class="th-id">ID · DETALLE</th>
                  <th class="th-n1"><span class="dot" style="background:#DC2626"></span> Insatisfactorio</th>
                  <th class="th-n2"><span class="dot" style="background:#EA580C"></span> En desarrollo</th>
                  <th class="th-n3"><span class="dot" style="background:#CA8A04"></span> Bueno</th>
                  <th class="th-n4"><span class="dot" style="background:#16A34A"></span> Supera</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of currentRows()">
                  <td class="td-id">
                    <div class="id-code">{{ row.code }}</div>
                    <div class="id-desc">{{ row.description }}</div>
                  </td>
                  <td class="td-cell" colspan="4">
                    <div class="detail-note">Descriptores por nivel configurables desde el microservicio de valoraciones.</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="rubric-footer">
              <span class="config-count">
                {{ currentRows().length }} identificadores configurados para {{ selectedSO()?.code }}
              </span>
            </div>
          </div>
        </ng-container>

        <!-- Periodos + Usuarios -->
        <div class="bottom-grid">
          <div class="mini-card">
            <div class="mc-header"><i class="pi pi-calendar mc-icon"></i><h2>Periodos académicos</h2></div>
            <div class="empty-inline" *ngIf="periods().length === 0">Sin periodos registrados.</div>
            <div class="period-row" *ngFor="let p of periods()">
              <div class="period-code">{{ p.period }}</div>
              <span class="status-badge open">Periodo</span>
            </div>
          </div>

          <div class="mini-card">
            <div class="mc-header"><i class="pi pi-users mc-icon"></i><h2>Usuarios y roles</h2></div>
            <div class="empty-inline" *ngIf="users().length === 0">Sin usuarios registrados.</div>
            <div class="user-row" *ngFor="let u of users()">
              <div class="u-av">{{ initials(u) }}</div>
              <span class="u-name">{{ u.name }} {{ u.surname }}</span>
              <span class="u-role" [class]="roleClass(u.role_id)">{{ roleName(u.role_id) }}</span>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .publish-banner {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--sidebar-bg); border-radius: var(--radius-md);
      padding: 16px 22px; margin-bottom: 22px; gap: 16px;
    }
    .pb-left { display: flex; align-items: center; gap: 14px; }
    .pb-icon {
      width: 36px; height: 36px; background: var(--primary); color: #1A1A2E;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .pb-title { font-size: 14px; font-weight: 600; color: #fff; }
    .pb-sub   { font-size: 12px; color: #9AA0AD; margin-top: 2px; }
    .btn-publish {
      background: var(--primary); color: #1A1A2E; border: none;
      border-radius: var(--radius-sm); padding: 10px 18px;
      font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
      white-space: nowrap; transition: background 0.15s;
    }
    .btn-publish:hover { background: var(--primary-dark); }

    .section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.08em; margin-bottom: 10px; }
    .so-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .so-tab {
      padding: 7px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600;
      border: 1px solid var(--border); background: #fff; color: var(--text-muted);
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .so-tab:hover  { border-color: var(--primary); color: var(--primary); }
    .so-tab.active { background: var(--primary); border-color: var(--primary); color: #1A1A2E; }

    .so-desc-card {
      display: flex; align-items: flex-start; gap: 14px;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 16px 20px; margin-bottom: 16px;
    }
    .so-badge {
      min-width: 46px; height: 40px; padding: 0 8px; border-radius: 10px; background: var(--accent); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 12px; flex-shrink: 0;
    }
    .so-desc-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .so-desc-text  { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

    .rubric-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 22px; }
    .rubric-table { width: 100%; border-collapse: collapse; }
    .rubric-table thead th {
      padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      background: var(--surface-2); border-bottom: 1px solid var(--border);
    }
    .th-id { width: 260px; color: var(--text-muted); }
    .th-n1 { color: var(--n1-color); } .th-n2 { color: var(--n2-color); }
    .th-n3 { color: var(--n3-color); } .th-n4 { color: var(--n4-color); }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; vertical-align: middle; }
    .rubric-table tbody td { border-bottom: 1px solid var(--border); vertical-align: top; padding: 12px 14px; }
    .rubric-table tbody tr:last-child td { border-bottom: none; }
    .id-code { font-size: 13px; font-weight: 700; color: var(--text); }
    .id-desc { font-size: 11px; color: var(--text-muted); margin-top: 3px; line-height: 1.45; }
    .detail-note { font-size: 12px; color: var(--text-light); font-style: italic; }
    .rubric-footer {
      display: flex; align-items: center; justify-content: flex-end;
      padding: 12px 16px; border-top: 1px solid var(--border);
    }
    .config-count { font-size: 12px; color: var(--text-muted); }

    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .mini-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; }
    .mc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
    .mc-header h2 { font-size: 15px; font-weight: 700; color: var(--text); }
    .mc-icon { color: var(--accent); font-size: 15px; }
    .period-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .period-row:last-child { border-bottom: none; }
    .period-code { font-size: 14px; font-weight: 700; color: var(--text); }
    .status-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .status-badge.open { background: var(--badge-open-bg); color: var(--badge-open); }
    .user-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .user-row:last-child { border-bottom: none; }
    .u-av { width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; }
    .u-name { flex: 1; font-size: 13px; font-weight: 500; color: var(--text); }
    .u-role { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 4px; }
    .u-role.coord   { color: var(--primary); background: rgba(255,165,2,0.1); }
    .u-role.docente { color: var(--accent); background: rgba(124,58,237,0.1); }
    .u-role.other   { color: var(--text-muted); background: var(--badge-draft-bg); }

    .empty-inline { font-size: 13px; color: var(--text-muted); padding: 12px 0; }
    .empty-card {
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 48px 24px; text-align: center; margin-bottom: 22px;
    }
    .empty-card i { font-size: 32px; color: var(--text-light); }
    .empty-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 12px 0 4px; }
    .empty-desc  { font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto; line-height: 1.6; }

    .state-box {
      display: flex; align-items: center; gap: 10px; padding: 18px 20px;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      font-size: 14px; color: var(--text-muted); margin-bottom: 22px;
    }
    .state-box.error { color: var(--badge-expired); border-color: #FECACA; }
  `]
})
export class StudentOutcomesComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  sos     = signal<StudentOutcome[]>([]);
  details = signal<PerformanceIndicatorDetail[]>([]);
  periods = signal<Period[]>([]);
  users   = signal<User[]>([]);
  roles   = signal<Role[]>([]);
  selectedId = signal<number | null>(null);

  selectedSO = computed(() => this.sos().find(s => s.id === this.selectedId()) ?? null);

  currentRows = computed(() => {
    const soId = this.selectedId();
    if (!soId) return [];
    // Cada detalle de indicador ligado a este SO representa un identificador (ID)
    return this.details()
      .filter(d => d.student_outcome_id === soId)
      .map((d, i) => ({ code: `ID${i + 1}`, description: d.description }));
  });

  constructor(private assesment: AssesmentApiService, private userApi: UserApiService) {}

  ngOnInit(): void {
    // Los SO y detalles vienen del Assesment_MS (sin auth).
    // Periodos y usuarios del User_MS (requiere JWT — puede fallar en modo demo).
    forkJoin({
      sos: this.assesment.getStudentOutcomes(),
      details: this.assesment.getPerformanceIndicatorDetails(),
    }).subscribe({
      next: ({ sos, details }) => {
        this.sos.set(sos ?? []);
        this.details.set(details ?? []);
        if (sos?.length) this.selectedId.set(sos[0].id);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la parametrización. Verifica el microservicio de valoraciones (puerto 8002).');
        this.loading.set(false);
      },
    });

    // Carga best-effort de periodos y usuarios (no bloquea la vista si falla el JWT)
    this.userApi.getPeriods().subscribe({ next: p => this.periods.set(p ?? []), error: () => {} });
    this.userApi.getRoles().subscribe({ next: r => this.roles.set(r ?? []), error: () => {} });
    this.userApi.getUsers().subscribe({ next: u => this.users.set(u ?? []), error: () => {} });
  }

  initials(u: User): string {
    return ((u.name?.[0] ?? '') + (u.surname?.[0] ?? '')).toUpperCase();
  }
  roleName(roleId: number): string {
    return this.roles().find(r => r.id === roleId)?.name ?? 'Usuario';
  }
  roleClass(roleId: number): string {
    const name = this.roleName(roleId).toLowerCase();
    if (name.includes('coord')) return 'coord';
    if (name.includes('docente')) return 'docente';
    return 'other';
  }

  publish() { alert('Cambios publicados. Los docentes ya pueden ver la rúbrica actualizada.'); }
}
