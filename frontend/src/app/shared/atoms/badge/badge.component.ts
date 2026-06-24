import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-badge',
  standalone: true,
  template: '<span class="mx-badge" [class.mx-badge--success]="tone === \'success\'" [class.mx-badge--warning]="tone === \'warning\'" [class.mx-badge--danger]="tone === \'danger\'"><ng-content /></span>',
  styles: [`
    .mx-badge {
      align-items: center;
      background: #eef2ff;
      border-radius: 999px;
      color: var(--mx-info);
      display: inline-flex;
      font: 700 11px Inter, system-ui, sans-serif;
      min-height: 24px;
      padding: 0 10px;
    }
    .mx-badge--success { background: #dcfce7; color: var(--mx-success); }
    .mx-badge--warning { background: #fff7ed; color: var(--mx-warning); }
    .mx-badge--danger { background: #fee2e2; color: var(--mx-danger); }
  `]
})
export class BadgeComponent {
  @Input() tone: 'default' | 'success' | 'warning' | 'danger' = 'default';
}
