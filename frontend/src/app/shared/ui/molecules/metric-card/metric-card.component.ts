import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-metric-card',
  standalone: true,
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.scss'
})
export class MetricCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() hint = '';
  @Input() accent = 'var(--mx-primary)';
}
