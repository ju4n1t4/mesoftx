import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Pie de página con enlaces legales y aviso de no afiliación con ABET. */
@Component({
  selector: 'app-legal-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="lf">
      <div class="lf-links">
        <a routerLink="/legal/privacidad">Política de tratamiento de datos</a>
        <span aria-hidden="true">·</span>
        <a routerLink="/legal/terminos">Términos de uso</a>
      </div>
      <p>© 2026 MESOFTX · Universidad Autónoma de Bucaramanga · Facultad de Ingeniería.
        MESOFTX es una herramienta institucional de la UNAB y no está afiliada ni avalada por ABET, Inc.</p>
    </footer>
  `,
  styles: [`
    .lf { padding: 20px 24px; text-align: center; border-top: 1px solid var(--border); background: #fff; font-family: 'Inter', sans-serif; }
    .lf-links { display: flex; gap: 10px; justify-content: center; font-size: 13px; margin-bottom: 6px; color: var(--text-muted); }
    .lf-links a { color: var(--primary); font-weight: 600; text-decoration: none; }
    .lf-links a:hover { text-decoration: underline; }
    p { margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.6; }
  `],
})
export class LegalFooterComponent {}
