import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-form-field',
  standalone: true,
  template: `
    <label>
      <span>{{ label }}</span>
      <ng-content />
    </label>
  `,
  styles: [`
    label {
      display: grid;
      gap: 7px;
    }
    span {
      color: #55515e;
      font-size: 12px;
      font-weight: 800;
    }
  `]
})
export class FormFieldComponent {
  @Input({ required: true }) label = '';
}
