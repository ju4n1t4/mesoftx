import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { UserApiService } from '../../../core/services/user-api.service';
import { AcademicPeriod, Year, Period } from '../../../core/models/abet.models';

interface PeriodRow { code: string; name: string; semester: string; year: string; }

@Component({
  selector: 'app-periodos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Periodos académicos</h1>
        <p>Gestión de años, semestres y períodos del proceso de acreditación.</p>
      </div>

      <div class="toolbar">
        <div></div>
        <button class="btn btn-primary btn-sm" (click)="showForm.set(true)">
          <i class="pi pi-plus"></i> Nuevo período
        </button>
      </div>

      <!-- Nuevo período form -->
      <div class="form-card" *ngIf="showForm()">
        <h2>Crear período académico</h2>
        <div class="form-row">
          <div class="form-field">
            <label class="form-label">Año</label>
            <input [(ngModel)]="newYear" class="form-control" placeholder="2026" />
          </div>
          <div class="form-field">
            <label class="form-label">Semestre (período)</label>
            <input [(ngModel)]="newPeriod" class="form-control" placeholder="10" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-outline btn-sm" (click)="showForm.set(false)">Cancelar</button>
          <button class="btn btn-primary btn-sm" (click)="addPeriod()" [disabled]="saving()">Guardar</button>
        </div>
        <div class="form-error" *ngIf="formError()">{{ formError() }}</div>
      </div>

      <div class="state-box" *ngIf="loading()">
        <i class="pi pi-spin pi-spinner"></i><span>Cargando períodos…</span>
      </div>
      <div class="notice" *ngIf="error()">
        <i class="pi pi-info-circle"></i><span>{{ error() }}</span>
      </div>

      <div class="empty-box" *ngIf="!loading() && periods().length === 0">
        <div class="empty-icon"><i class="pi pi-calendar"></i></div>
        <div class="empty-title">No hay períodos registrados</div>
        <div class="empty-desc">Crea el primer período académico para habilitar el registro de valoraciones.</div>
      </div>

      <div class="table-card" *ngIf="!loading() && periods().length > 0">
        <table class="data-table">
          <thead>
            <tr><th>Código</th><th>Semestre</th><th>Año</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of periods()">
              <td><span class="period-code">{{ p.code }}</span></td>
              <td>{{ p.semester }}</td>
              <td>{{ p.year }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;border:1px solid transparent;cursor:pointer;font-family:inherit;}
    .btn-primary{background:var(--primary);color:#1A1A2E;}
    .btn-primary:hover{background:var(--primary-dark);}
    .btn-primary:disabled{opacity:.6;cursor:default;}
    .btn-outline{background:#fff;color:var(--text-muted);border-color:var(--border);}
    .btn-outline:hover{color:var(--text);border-color:var(--text-muted);}
    .btn-sm{padding:8px 16px;font-size:13px;}
    .form-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;margin-bottom:16px;}
    .form-card h2{font-size:15px;font-weight:700;margin-bottom:16px;}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
    .form-field{display:flex;flex-direction:column;}
    .form-label{font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;}
    .form-control{padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;color:var(--text);font-family:inherit;}
    .form-control:focus{outline:none;border-color:var(--primary);}
    .form-actions{display:flex;gap:10px;justify-content:flex-end;}
    .form-error{margin-top:10px;font-size:13px;color:var(--badge-expired);}
    .table-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;}
    .data-table{width:100%;border-collapse:collapse;}
    .data-table thead th{padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);background:var(--surface-2);border-bottom:1px solid var(--border);}
    .data-table tbody td{padding:13px 16px;border-bottom:1px solid var(--border);font-size:13px;}
    .data-table tbody tr:last-child td{border-bottom:none;}
    .period-code{font-weight:700;color:var(--accent);}
    .state-box{display:flex;align-items:center;gap:10px;padding:16px 20px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);font-size:14px;color:var(--text-muted);}
    .notice{display:flex;align-items:center;gap:10px;background:rgba(255,165,2,0.08);border:1px solid rgba(255,165,2,0.25);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--text-muted);}
    .notice i{color:var(--primary);flex-shrink:0;}
    .empty-box{background:#fff;border:1px dashed var(--border);border-radius:var(--radius-md);padding:48px 24px;text-align:center;}
    .empty-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 14px;background:var(--surface-2);color:var(--text-muted);display:flex;align-items:center;justify-content:center;font-size:24px;}
    .empty-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;}
    .empty-desc{font-size:13px;color:var(--text-muted);max-width:420px;margin:0 auto;line-height:1.6;}
  `]
})
export class PeriodosComponent implements OnInit {
  showForm = signal(false);
  loading = signal(true);
  error   = signal<string | null>(null);
  saving  = signal(false);
  formError = signal<string | null>(null);
  periods = signal<PeriodRow[]>([]);

  newYear = ''; newPeriod = '';

  private years: Year[] = [];
  private periodList: Period[] = [];

  constructor(private users: UserApiService) {}

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      academic: this.users.getAcademicPeriods(),
      years: this.users.getYears(),
      periods: this.users.getPeriods(),
    }).subscribe({
      next: ({ academic, years, periods }) => {
        this.years = years ?? [];
        this.periodList = periods ?? [];
        this.periods.set(this.mapRows(academic ?? []));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los períodos. Verifica la conexión con el servidor.');
        this.loading.set(false);
      },
    });
  }

  private mapRows(academic: AcademicPeriod[]): PeriodRow[] {
    return academic.map(ap => {
      const yr = this.years.find(y => y.id === ap.year_id)?.year;
      const pr = this.periodList.find(p => p.id === ap.period_id)?.period;
      const yearStr = yr != null ? String(yr) : '';
      const periodStr = pr ?? '';
      return {
        code: ap.code || `${yearStr}${periodStr}`,
        name: ap.name || `${yearStr}-${periodStr}`,
        semester: periodStr,
        year: yearStr,
      };
    });
  }

  addPeriod(): void {
    this.formError.set(null);
    const yearNum = parseInt(this.newYear, 10);
    if (!yearNum || !this.newPeriod.trim()) {
      this.formError.set('Indica año y semestre.');
      return;
    }
    this.saving.set(true);
    const period = this.newPeriod.trim();
    const ensureYear = this.years.find(y => y.year === yearNum);
    const ensurePeriod = this.periodList.find(p => p.period === period);

    const yearId$ = ensureYear
      ? Promise.resolve(ensureYear)
      : this.users.createYear({ year: yearNum }).toPromise();
    const periodId$ = ensurePeriod
      ? Promise.resolve(ensurePeriod)
      : this.users.createPeriod({ period }).toPromise();

    Promise.all([yearId$, periodId$]).then(([y, p]) => {
      const yId = (y as Year)?.id;
      const pId = (p as Period)?.id;
      if (yId == null || pId == null) throw new Error('missing ids');
      const code = `${yearNum}${period}`;
      return this.users.createAcademicPeriod({ name: code, code, year_id: yId, period_id: pId }).toPromise();
    }).then(() => {
      this.newYear = ''; this.newPeriod = '';
      this.showForm.set(false);
      this.saving.set(false);
      this.load();
    }).catch(() => {
      this.saving.set(false);
      this.formError.set('No se pudo crear el período. Revisa los datos e intenta de nuevo.');
    });
  }
}
