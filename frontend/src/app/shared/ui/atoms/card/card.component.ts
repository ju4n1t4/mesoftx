import { Component, Input } from '@angular/core';

@Component({
  selector: 'mx-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent {
  @Input() compact = false;
}
