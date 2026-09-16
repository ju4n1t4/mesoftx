import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { BulkImportSummary } from './bulk-excel.service';

@Component({
  selector: 'app-bulk-result-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, TableModule, TabsModule, TagModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible" (visibleChange)="setVisible($event)" [modal]="true" [style]="{ width: '760px' }" [header]="title">
      <p-tabs value="success">
        <p-tablist>
          <p-tab value="success">Exitosos <p-tag severity="success" [value]="summary.success.length + ''"></p-tag></p-tab>
          <p-tab value="skipped">Omitidos <p-tag severity="warn" [value]="summary.skipped.length + ''"></p-tag></p-tab>
          <p-tab value="errors">Errores <p-tag severity="danger" [value]="summary.errors.length + ''"></p-tag></p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="success">
            <ng-container *ngTemplateOutlet="resultTable; context: { $implicit: summary.success, empty: 'No hubo registros creados.' }"></ng-container>
          </p-tabpanel>
          <p-tabpanel value="skipped">
            <ng-container *ngTemplateOutlet="resultTable; context: { $implicit: summary.skipped, empty: 'No hubo registros omitidos.' }"></ng-container>
          </p-tabpanel>
          <p-tabpanel value="errors">
            <ng-container *ngTemplateOutlet="resultTable; context: { $implicit: summary.errors, empty: 'No hubo errores.' }"></ng-container>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <ng-template #resultTable let-items let-empty="empty">
        <p-table [value]="items" styleClass="p-datatable-sm" [paginator]="items.length > 8" [rows]="8">
          <ng-template pTemplate="header">
            <tr><th style="width:6rem">Fila</th><th>Registro</th><th>Detalle</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr><td>{{ item.row }}</td><td>{{ item.label }}</td><td>{{ item.detail || '-' }}</td></tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="3" class="empty-cell">{{ empty }}</td></tr>
          </ng-template>
        </p-table>
      </ng-template>

      <ng-template pTemplate="footer">
        <button pButton type="button" label="Cerrar" (click)="setVisible(false)"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .empty-cell { text-align: center; color: var(--text-muted); padding: 20px; }
    p-tag { margin-left: 6px; }
  `],
})
export class BulkResultDialogComponent {
  @Input() title = 'Resultado del cargue masivo';
  @Input() summary: BulkImportSummary = { success: [], skipped: [], errors: [] };
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  setVisible(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }
}
