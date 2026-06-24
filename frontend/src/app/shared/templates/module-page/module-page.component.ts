import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-module-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="module-page__header">
      <div>
        <span>{{ eyebrow }}</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <ng-content select="[actions]" />
    </header>
    <ng-content />
  `,
  styles: [`
    .module-page__header {
      align-items: flex-start;
      display: flex;
      gap: 18px;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    span { color: var(--mx-primary); font: 800 12px Inter, system-ui, sans-serif; text-transform: uppercase; }
    h1 { color: var(--mx-ink); font: 800 28px Inter, system-ui, sans-serif; letter-spacing: 0; margin: 3px 0 6px; }
    p { color: var(--mx-muted); font: 500 14px/1.5 Inter, system-ui, sans-serif; max-width: 760px; }
    @media (max-width: 760px) {
      .module-page__header { display: grid; }
    }
  `]
})
export class ModulePageComponent {
  @Input() eyebrow = 'MesoftX';
  @Input() title = '';
  @Input() description = '';
}
