import { ButtonAtom } from '../../atoms/button/button.directive';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { BulkImportSummary } from '../../../services/bulk-excel.service';

@Component({
  selector: 'app-bulk-result-dialog',
  standalone: true,
  imports: [ButtonAtom, CommonModule, DialogModule, TableModule, TabsModule, TagModule, ButtonModule],
  templateUrl: './bulk-result-dialog.component.html',
  styleUrl: './bulk-result-dialog.component.scss',
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
