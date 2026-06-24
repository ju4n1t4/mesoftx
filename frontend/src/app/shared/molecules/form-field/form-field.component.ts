import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="mx-form-field">
      <span>{{ label }}</span>
      <ng-content />
      <small *ngIf="hint">{{ hint }}</small>
    </label>
  `,
  styles: [`
    .mx-form-field {
      display: grid;
      gap: 7px;
    }
    span {
      color: var(--mx-ink);
      font: 700 12px Inter, system-ui, sans-serif;
    }
    small {
      color: var(--mx-muted);
      font: 500 11px Inter, system-ui, sans-serif;
    }
  `]
})
export class FormFieldComponent {
  @Input({ required: true }) label = '';
  @Input() hint = '';
}
