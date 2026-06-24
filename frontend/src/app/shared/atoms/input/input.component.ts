import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
    <textarea *ngIf="type === 'textarea'; else inputTpl" class="mx-input mx-input--textarea" [value]="value" [placeholder]="placeholder" (input)="update($event)" (blur)="onTouched()"></textarea>
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
  `]
})
export class InputComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'number' | 'password' | 'textarea' = 'text';
  @Input() placeholder = '';
  value = '';
  onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: string | number | null): void {
    this.value = value == null ? '' : String(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  update(event: Event): void {
    const nextValue = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.value = nextValue;
    this.onChange(nextValue);
  }
}
