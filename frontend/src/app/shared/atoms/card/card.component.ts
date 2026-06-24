import { Component } from '@angular/core';

@Component({
  selector: 'mx-card',
  standalone: true,
  template: '<section class="mx-card"><ng-content /></section>',
  styles: [`
    .mx-card {
      background: var(--mx-surface);
      border: 1px solid var(--mx-border);
      border-radius: 8px;
      box-shadow: 0 16px 36px -30px rgba(22, 21, 29, .35);
      padding: 20px;
    }
  `]
})
export class CardComponent {}
