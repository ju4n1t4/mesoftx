import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-metric-card',
  standalone: true,
  template: `
    <article class="metric" [style.--accent]="accent">
      <span>{{ label }}</span>
      <strong>{{ value }}</strong>
      <small>{{ hint }}</small>
    </article>
  `,
  styles: [`
    .metric {
      background: #fff;
      border: 1px solid var(--mx-border);
      border-radius: var(--mx-radius-card);
      border-top: 3px solid var(--accent);
      box-shadow: var(--mx-shadow-soft);
      min-height: 112px;
      padding: 17px 18px;
    }
    span {
      color: var(--mx-muted);
      display: block;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    strong {
      color: var(--mx-ink);
      display: block;
      font-size: 30px;
      font-weight: 800;
      line-height: 1;
    }
    small {
      color: var(--accent);
      display: block;
      font-size: 11px;
      font-weight: 800;
      margin-top: 8px;
    }
  `]
})
export class MetricCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() hint = '';
  @Input() accent = 'var(--mx-primary)';
}
