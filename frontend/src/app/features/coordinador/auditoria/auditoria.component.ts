import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface AuditLog {
  date: string; user: string; initial: string; color: string;
  action: string; type: string; typeLabel: string; detail: string;
}

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Auditoría</h1>
        <p>Registro completo de acciones realizadas en la plataforma.</p>
      </div>
      <div class="filters">
        <div class="search-wrap">
          <i class="pi pi-search"></i>
          <input [(ngModel)]="search" placeholder="Buscar usuario, acción…" class="search-input" />
        </div>
        <select [(ngModel)]="filterType" class="filter-select">
          <option value="">Todos los tipos</option>
          <option value="login">Login</option>
          <option value="valoracion">Valoración</option>
          <option value="config">Configuración</option>
        </select>
      </div>

      <div class="empty-box" *ngIf="filtered().length === 0">
        <div class="empty-icon"><i class="pi pi-history"></i></div>
        <div class="empty-title">No hay registros de auditoría</div>
        <div class="empty-desc">Las acciones realizadas por los usuarios en la plataforma se registrarán aquí.</div>
      </div>

      <div class="table-card" *ngIf="filtered().length > 0">
        <table class="data-table">
          <thead>
            <tr><th>Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Tipo</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of filtered()">
              <td class="date-cell">{{ log.date }}</td>
              <td>
                <div class="user-cell">
                  <div class="u-av" [style.background]="log.color">{{ log.initial }}</div>
                  {{ log.user }}
                </div>
              </td>
              <td>{{ log.action }}</td>
              <td><span class="type-tag" [class]="log.type">{{ log.typeLabel }}</span></td>
              <td class="detail-cell">{{ log.detail }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .filters{display:flex;gap:12px;margin-bottom:20px;}
    .search-wrap{position:relative;display:flex;align-items:center;}
    .search-wrap i{position:absolute;left:12px;color:var(--text-light);font-size:13px;}
    .search-input{width:260px;padding:10px 14px 10px 34px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;color:var(--text);font-family:inherit;}
    .search-input:focus{outline:none;border-color:var(--primary);}
    .filter-select{padding:9px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;color:var(--text);background:#fff;font-family:inherit;}
    .table-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;}
    .data-table{width:100%;border-collapse:collapse;}
    .data-table thead th{padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);background:var(--surface-2);border-bottom:1px solid var(--border);}
    .data-table tbody td{padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;}
    .data-table tbody tr:last-child td{border-bottom:none;}
    .data-table tbody tr:hover td{background:#F9FAFB;}
    .date-cell{font-size:12px;color:var(--text-muted);white-space:nowrap;}
    .user-cell{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);}
    .u-av{width:28px;height:28px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0;}
    .type-tag{font-size:11px;font-weight:600;padding:2px 10px;border-radius:4px;}
    .type-tag.login{background:rgba(3,105,161,0.1);color:#0369A1;}
    .type-tag.valoracion{background:rgba(255,165,2,0.1);color:var(--primary);}
    .type-tag.config{background:rgba(124,58,237,0.1);color:var(--accent);}
    .detail-cell{font-size:12px;color:var(--text-muted);}
    .empty-box{background:#fff;border:1px dashed var(--border);border-radius:var(--radius-md);padding:48px 24px;text-align:center;}
    .empty-icon{width:56px;height:56px;border-radius:50%;margin:0 auto 14px;background:var(--surface-2);color:var(--text-muted);display:flex;align-items:center;justify-content:center;font-size:24px;}
    .empty-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;}
    .empty-desc{font-size:13px;color:var(--text-muted);max-width:420px;margin:0 auto;line-height:1.6;}
  `]
})
export class AuditoriaComponent {
  search = ''; filterType = '';
  logs: AuditLog[] = [];

  filtered(): AuditLog[] {
    const q = this.search.toLowerCase();
    return this.logs.filter(l =>
      (!q || l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q)) &&
      (!this.filterType || l.type === this.filterType)
    );
  }
}
