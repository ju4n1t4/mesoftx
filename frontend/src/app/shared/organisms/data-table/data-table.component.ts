import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { EntityRecord } from '../../../core/models/api.models';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'mx-data-table',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="table-wrap">
      <table *ngIf="rows.length; else emptyState">
        <thead>
          <tr>
            <th *ngFor="let column of columns">{{ column }}</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows">
            <td *ngFor="let column of columns">{{ display(row[column]) }}</td>
            <td><mx-button variant="secondary" (clicked)="edit.emit(row)">Editar</mx-button></td>
          </tr>
        </tbody>
      </table>
      <ng-template #emptyState>
        <div class="empty">No hay registros para mostrar.</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 720px; width: 100%; }
    th, td { border-bottom: 1px solid var(--mx-border); padding: 13px 12px; text-align: left; vertical-align: top; }
    th { color: var(--mx-muted); font: 800 11px Inter, system-ui, sans-serif; text-transform: uppercase; }
    td { color: var(--mx-ink); font: 500 13px Inter, system-ui, sans-serif; }
    .empty {
      align-items: center;
      background: var(--mx-surface-alt);
      border: 1px dashed var(--mx-border);
      border-radius: 8px;
      color: var(--mx-muted);
      display: flex;
      font: 600 13px Inter, system-ui, sans-serif;
      justify-content: center;
      min-height: 140px;
    }
  `]
})
export class DataTableComponent {
  @Input() rows: EntityRecord[] = [];
  @Input() columns: string[] = [];
  @Output() edit = new EventEmitter<EntityRecord>();

  display(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value == null ? '-' : String(value);
  }
}
