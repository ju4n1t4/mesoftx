import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss'
})
export class BadgeComponent {
  @Input() tone: 'neutral' | 'success' | 'warning' | 'danger' | 'secondary' = 'neutral';
}
