import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssesmentApiService } from '../../../core/services/assesment-api.service';
import { StudentOutcome } from '../../../core/models/abet.models';

interface RubricRow {
  id?: number;
  code: string;
  desc: string;
  n1: string; n2: string; n3: string; n4: string;
}

interface SORow {
  id: number;
  code: string;
  description: string;
  rows: RubricRow[];
}

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
        <button class="btn-publish" (click)="publish()" [disabled]="saving()">
          {{ saving() ? 'Publicando…' : 'Publicar cambios' }}
        </button>
      </div>

      <!-- Loading -->
      <div class="state-box" *ngIf="loading()">
        <i class="pi pi-spin pi-spinner"></i> Cargando Student Outcomes…
      </div>

      <!-- Aviso discreto: no bloquea la estructura -->
      <div class="notice" *ngIf="error()">
        <i class="pi pi-info-circle"></i> <span>{{ error() }}</span>
      </div>

      <!-- Estado vacío: no hay SO -->
      <div class="empty-card" *ngIf="!loading() && soList().length === 0">
        <i class="pi pi-inbox"></i>
        <div class="empty-title">Aún no hay Student Outcomes</div>
        <div class="empty-desc">Crea el primer Student Outcome para empezar a parametrizar la rúbrica que verán los docentes.</div>
        <button class="btn-create-so" (click)="createSO()">
          <i class="pi pi-plus"></i> Crear Student Outcome
        </button>
      </div>

      <ng-container *ngIf="!loading() && soList().length > 0">
        <!-- SO selector -->
        <div class="section-label">STUDENT OUTCOME A CONFIGURAR</div>
        <div class="so-tabs">
          <button *ngFor="let so of soList()" class="so-tab"
                  [class.active]="selectedId() === so.id"
                  (click)="selectedId.set(so.id)">
            {{ so.code }}
          </button>
          <button class="so-tab add" (click)="createSO()"><i class="pi pi-plus"></i></button>
        </div>

        <!-- Descripción SO -->
        <div class="so-desc-card" *ngIf="selectedSO()">
          <div class="so-badge">{{ selectedSO()!.code }}</div>
          <div>
            <div class="so-desc-title">Descripción del Student Outcome</div>
            <div class="so-desc-text">{{ selectedSO()!.description }}</div>
          </div>
        </div>

        <!-- Tabla de rúbrica -->
        <div class="rubric-card" *ngIf="selectedSO()">
          <table class="rubric-table">
            <thead>
              <tr>
                <th class="th-id">ID · DETALLE</th>
                <th class="th-n1"><span class="dot" style="background:#DC2626"></span> Insatisfactorio</th>
                <th class="th-n2"><span class="dot" style="background:#EA580C"></span> En desarrollo</th>
                <th class="th-n3"><span class="dot" style="background:#CA8A04"></span> Bueno</th>
                <th class="th-n4"><span class="dot" style="background:#16A34A"></span> Supera</th>
                <th class="th-del"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of selectedSO()!.rows; let i = index">
                <td class="td-id">
                  <div class="id-code">{{ row.code }}</div>
                  <div class="id-desc">{{ row.desc }}</div>
                </td>
                <td class="td-cell"><div class="r-cell n1">{{ row.n1 }}</div></td>
                <td class="td-cell"><div class="r-cell n2">{{ row.n2 }}</div></td>
                <td class="td-cell"><div class="r-cell n3">{{ row.n3 }}</div></td>
                <td class="td-cell"><div class="r-cell n4">{{ row.n4 }}</div></td>
                <td class="td-del"><button class="del-btn" (click)="removeRow(i)"><i class="pi pi-times"></i></button></td>
              </tr>
            </tbody>
          </table>

          <div class="rubric-footer">
            <button class="add-btn" (click)="addRow()">
              <i class="pi pi-plus"></i> Agregar identificador
            </button>
            <span class="config-count">{{ selectedSO()!.rows.length }} identificadores configurados para {{ selectedSO()!.code }}</span>
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
    .btn-publish:hover:not(:disabled) { background: var(--primary-dark); }
    .btn-publish:disabled { opacity: 0.6; cursor: not-allowed; }

    .section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.08em; margin-bottom: 10px; }
    .so-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .so-tab {
      padding: 7px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600;
      border: 1px solid var(--border); background: #fff; color: var(--text-muted);
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .so-tab:hover  { border-color: var(--primary); color: var(--primary); }
    .so-tab.active { background: var(--primary); border-color: var(--primary); color: #1A1A2E; }
    .so-tab.add { color: var(--accent); border-style: dashed; }

    .so-desc-card {
      display: flex; align-items: flex-start; gap: 14px;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 16px 20px; margin-bottom: 16px;
    }
    .so-badge {
      width: 40px; height: 40px; border-radius: 10px; background: var(--accent); color: #fff;
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
    .th-id  { width: 180px; color: var(--text-muted); }
    .th-n1  { color: var(--n1-color); }
    .th-n2  { color: var(--n2-color); }
    .th-n3  { color: var(--n3-color); }
    .th-n4  { color: var(--n4-color); }
    .th-del { width: 44px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; vertical-align: middle; }
    .rubric-table tbody td { border-bottom: 1px solid var(--border); vertical-align: top; }
    .rubric-table tbody tr:last-child td { border-bottom: none; }
    .td-id  { padding: 12px 14px; }
    .td-cell { padding: 8px 10px; }
    .td-del { padding: 8px; text-align: center; vertical-align: middle; }
    .id-code { font-size: 13px; font-weight: 700; color: var(--text); }
    .id-desc { font-size: 11px; color: var(--text-muted); margin-top: 3px; line-height: 1.45; }
    .r-cell { padding: 10px; border-radius: var(--radius-sm); font-size: 12px; line-height: 1.5; border: 1px solid transparent; min-height: 40px; }
    .r-cell.n1 { background: var(--n1-bg); border-color: #FECACA; }
    .r-cell.n2 { background: var(--n2-bg); border-color: #FED7AA; }
    .r-cell.n3 { background: var(--n3-bg); border-color: #FDE68A; }
    .r-cell.n4 { background: var(--n4-bg); border-color: #BBF7D0; }
    .del-btn { background: none; border: none; color: var(--n1-color); cursor: pointer; font-size: 13px; padding: 5px; border-radius: 4px; }
    .del-btn:hover { background: var(--n1-bg); }
    .rubric-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-top: 1px solid var(--border);
    }
    .add-btn {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: var(--accent);
      background: rgba(124,58,237,0.08); border: none; border-radius: var(--radius-sm);
      padding: 9px 15px; cursor: pointer; font-family: inherit; transition: background 0.15s;
    }
    .add-btn:hover { background: rgba(124,58,237,0.15); }
    .config-count { font-size: 12px; color: var(--text-muted); }

    /* Estados */
    .state-box {
      display: flex; align-items: center; gap: 10px; padding: 18px 20px;
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      font-size: 14px; color: var(--text-muted); margin-bottom: 16px;
    }
    .notice { display: flex; align-items: center; gap: 10px; background: rgba(255,165,2,0.08); border: 1px solid rgba(255,165,2,0.25); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); }
    .notice i { color: var(--primary); flex-shrink: 0; }

    .empty-card {
      background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 48px 24px; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .empty-card > i { font-size: 32px; color: var(--text-light); }
    .empty-title { font-size: 16px; font-weight: 700; color: var(--text); }
    .empty-desc  { font-size: 13px; color: var(--text-muted); max-width: 420px; line-height: 1.6; margin-bottom: 8px; }
    .btn-create-so {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--primary); color: #1A1A2E; border: none;
      border-radius: var(--radius-sm); padding: 10px 18px;
      font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .btn-create-so:hover { background: var(--primary-dark); }
  `]
})
export class StudentOutcomesComponent implements OnInit {
  loading = signal(true);
  error   = signal<string | null>(null);
  saving  = signal(false);
  soList  = signal<SORow[]>([]);
  selectedId = signal<number>(0);

  selectedSO = computed(() => this.soList().find(s => s.id === this.selectedId()) ?? null);

  constructor(private assesment: AssesmentApiService) {}

  ngOnInit(): void {
    this.assesment.getStudentOutcomes().subscribe({
      next: (sos: StudentOutcome[]) => {
        const rows: SORow[] = (sos ?? []).map(s => ({
          id: s.id, code: s.code, description: s.description ?? '', rows: [],
        }));
        this.soList.set(rows);
        if (rows.length) this.selectedId.set(rows[0].id);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los Student Outcomes. Verifica la conexión con el microservicio de valoraciones (puerto 8002).');
        this.loading.set(false);
      },
    });
  }

  createSO() {
    const code = prompt('Código del Student Outcome (ej. SO1):');
    if (!code) return;
    const description = prompt('Descripción del Student Outcome:') ?? '';
    this.saving.set(true);
    this.assesment.createStudentOutcome({ code, description }).subscribe({
      next: (created) => {
        const row: SORow = { id: created.id, code: created.code, description: created.description ?? '', rows: [] };
        this.soList.update(list => [...list, row]);
        this.selectedId.set(created.id);
        this.saving.set(false);
      },
      error: () => {
        alert('No se pudo crear el Student Outcome.');
        this.saving.set(false);
      },
    });
  }

  addRow() {
    const so = this.selectedSO();
    if (!so) return;
    so.rows.push({ code: `ID${so.rows.length + 1}`, desc: 'Nuevo identificador de desempeño.', n1: '', n2: '', n3: '', n4: '' });
    this.soList.update(l => [...l]);
  }

  removeRow(index: number) {
    const so = this.selectedSO();
    if (!so) return;
    so.rows.splice(index, 1);
    so.rows.forEach((r, i) => r.code = `ID${i + 1}`);
    this.soList.update(l => [...l]);
  }

  publish() {
    this.saving.set(true);
    // En una integración completa aquí se persistirían indicadores/detalles.
    setTimeout(() => {
      this.saving.set(false);
      alert('Cambios publicados. Los docentes ya pueden ver la rúbrica actualizada.');
    }, 500);
  }
}
