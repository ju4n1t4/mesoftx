import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'mx-button',
  standalone: true,
  template: `
    <button class="mx-button" [class.mx-button--secondary]="variant === 'secondary'" [type]="type" [disabled]="disabled" (click)="clicked.emit()">
      <ng-content />
    </button>
  `,
  styles: [`
    .mx-button {
      border: 0;
      border-radius: 12px;
      background: var(--mx-primary);
      color: #fff;
      cursor: pointer;
      font: 700 14px Inter, system-ui, sans-serif;
      min-height: 42px;
      padding: 0 18px;
      transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
      box-shadow: 0 8px 18px -10px var(--mx-primary);
    }
    .mx-button:hover:not(:disabled) { transform: translateY(-1px); }
    .mx-button:disabled { cursor: not-allowed; opacity: .55; }
    .mx-button--secondary {
      background: var(--mx-surface);
      border: 1px solid var(--mx-border);
      color: var(--mx-ink);
      box-shadow: none;
    }
  `]
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() disabled = false;
  @Output() clicked = new EventEmitter<void>();
}
