import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Pie de página con enlaces legales y aviso de no afiliación con ABET. */
@Component({
  selector: 'app-legal-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-footer.component.html',
  styleUrl: './legal-footer.component.scss',
})
export class LegalFooterComponent {}
