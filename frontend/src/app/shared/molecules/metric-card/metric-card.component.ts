import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-metric-card',
  standalone: true,
  template: `
    <article class="metric">
      <span>{{ label }}</span>
      <strong>{{ value }}</strong>
      <small>{{ detail }}</small>
    </article>
  `,
  styles: [`
    .metric {
      background: var(--mx-surface);
      border: 1px solid var(--mx-border);
      border-radius: 8px;
      display: grid;
      gap: 8px;
      padding: 18px;
    }
    span { color: var(--mx-muted); font: 700 12px Inter, system-ui, sans-serif; }
    strong { color: var(--mx-ink); font: 800 28px Inter, system-ui, sans-serif; }
    small { color: var(--mx-muted); font: 500 12px Inter, system-ui, sans-serif; }
  `]
})
export class MetricCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() detail = '';
}
