import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { ResourceOption } from '../../../core/models/api.models';

@Component({
  selector: 'mx-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: InputComponent,
      multi: true
    }
  ],
  template: `
    <textarea *ngIf="type === 'textarea'; else controlTpl" class="mx-input mx-input--textarea" [value]="value" [placeholder]="placeholder" (input)="update($event)" (blur)="onTouched()"></textarea>
    <ng-template #controlTpl>
      <select *ngIf="type === 'select' || type === 'multiselect'; else inputTpl" class="mx-input" [multiple]="type === 'multiselect'" [value]="value" (change)="update($event)" (blur)="onTouched()">
        <option *ngIf="type === 'select'" value="">Seleccione una opcion</option>
        <option *ngFor="let option of options" [value]="option.value" [selected]="isSelected(option.value)">{{ option.label }}</option>
      </select>
    </ng-template>
    <ng-template #inputTpl>
      <input class="mx-input" [type]="type" [value]="value" [placeholder]="placeholder" (input)="update($event)" (blur)="onTouched()">
    </ng-template>
  `,
  styles: [`
    .mx-input {
      background: #fff;
      border: 1.5px solid var(--mx-border);
      border-radius: 12px;
      color: var(--mx-ink);
      font: 500 14px Inter, system-ui, sans-serif;
      min-height: 42px;
      outline: none;
      padding: 0 13px;
      width: 100%;
    }
    .mx-input:focus {
      border-color: var(--mx-primary);
      box-shadow: 0 0 0 3px rgba(255, 165, 2, .16);
    }
    .mx-input--textarea {
      min-height: 92px;
      padding: 12px 13px;
      resize: vertical;
    }
    select.mx-input[multiple] {
      min-height: 120px;
      padding: 8px 13px;
    }
  `]
})
export class InputComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'number' | 'password' | 'textarea' | 'select' | 'multiselect' = 'text';
  @Input() placeholder = '';
  @Input() options: ResourceOption[] = [];
  value: string | string[] = '';
  onChange: (value: string | string[]) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: string | number | Array<string | number> | null): void {
    if (Array.isArray(value)) {
      this.value = value.map(String);
      return;
    }
    this.value = value == null ? '' : String(value);
  }

  registerOnChange(fn: (value: string | string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  update(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (target instanceof HTMLSelectElement && target.multiple) {
      const values = Array.from(target.selectedOptions).map((option) => option.value);
      this.value = values;
      this.onChange(values);
      return;
    }
    const nextValue = target.value;
    this.value = nextValue;
    this.onChange(nextValue);
  }

  isSelected(optionValue: string | number): boolean {
    const normalizedValue = String(optionValue);
    return Array.isArray(this.value) ? this.value.includes(normalizedValue) : this.value === normalizedValue;
  }
}
