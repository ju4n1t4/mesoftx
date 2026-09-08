import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-card',
  standalone: true,
  template: '<section class="mx-card" [class.compact]="compact"><ng-content /></section>',
  styles: [`
    .mx-card {
      background: var(--mx-surface);
      border: 1px solid var(--mx-border);
      border-radius: var(--mx-radius-card);
      box-shadow: var(--mx-shadow-soft);
      padding: 22px;
    }
    .mx-card.compact {
      padding: 16px;
    }
  `]
})
export class CardComponent {
  @Input() compact = false;
}
