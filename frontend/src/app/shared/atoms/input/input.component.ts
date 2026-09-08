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
    <div class="field">
      <i *ngIf="icon" class="pi" [ngClass]="icon"></i>
      <input [type]="type" [value]="value" [placeholder]="placeholder" [autocomplete]="autocomplete" (input)="update($event)" (blur)="onTouched()">
    </div>
  `,
  styles: [`
    .field {
      align-items: center;
      background: #fff;
      border: 1px solid var(--mx-border);
      border-radius: 8px;
      display: flex;
      gap: 10px;
      min-height: 42px;
      padding: 0 12px;
    }
    .field:focus-within {
      border-color: var(--mx-primary);
      box-shadow: 0 0 0 3px rgba(255, 165, 2, .16);
    }
    i {
      color: #9ca3af;
      font-size: 13px;
    }
    input {
      border: 0;
      color: var(--mx-ink);
      flex: 1;
      min-width: 0;
      outline: 0;
    }
  `]
})
export class InputComponent implements ControlValueAccessor {
  @Input() type: 'email' | 'password' | 'text' = 'text';
  @Input() placeholder = '';
  @Input() icon = '';
  @Input() autocomplete = '';

  value = '';
  onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  update(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}
