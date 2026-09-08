import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'mx-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="mx-button" [class.secondary]="variant === 'secondary'" [class.ghost]="variant === 'ghost'" [type]="type" [disabled]="disabled" (click)="clicked.emit()">
      <i *ngIf="icon" class="pi" [ngClass]="icon"></i>
      <span><ng-content /></span>
    </button>
  `,
  styles: [`
    .mx-button {
      align-items: center;
      background: var(--mx-primary);
      border: 1px solid var(--mx-primary);
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      font-weight: 800;
      gap: 8px;
      justify-content: center;
      min-height: 42px;
      padding: 0 16px;
      transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
      white-space: nowrap;
    }
    .mx-button:hover:not(:disabled) {
      box-shadow: 0 12px 28px rgba(255, 165, 2, .26);
      transform: translateY(-1px);
    }
    .mx-button:disabled {
      cursor: not-allowed;
      opacity: .58;
    }
    .mx-button.secondary {
      background: var(--mx-secondary);
      border-color: var(--mx-secondary);
    }
    .mx-button.secondary:hover:not(:disabled) {
      box-shadow: 0 12px 28px rgba(124, 58, 237, .22);
    }
    .mx-button.ghost {
      background: #fff;
      border-color: var(--mx-border);
      color: var(--mx-ink);
    }
  `]
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  @Input() icon = '';
  @Input() disabled = false;
  @Output() clicked = new EventEmitter<void>();
}
