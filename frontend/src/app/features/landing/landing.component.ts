import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="landing">
      <header class="lnd-header">
        <div class="lnd-header-inner">
          <div class="brand">
            <div class="brand-icon">M</div>
            <div>
              <div class="brand-name">MESOFTX</div>
              <div class="brand-sub">Facultad de Ingeniería · UNAB</div>
            </div>
          </div>
          <nav class="lnd-nav">
            <a routerLink="/publico" class="lnd-link">Vista pública ABET</a>
            <a routerLink="/auth/login" class="lnd-btn">Iniciar sesión</a>
          </nav>
        </div>
      </header>

      <section class="hero">
        <div class="hero-left">
          <div class="hero-tag">Valoración · Acreditación ABET</div>
          <h1>Valoración de Resultados de Aprendizaje <span>ABET</span></h1>
          <p>Plataforma institucional de la Facultad de Ingeniería UNAB. Trazable, colaborativa y lista para tu proceso de acreditación.</p>
          <div class="hero-ctas">
            <a routerLink="/auth/login" class="lnd-btn lg">Acceder al sistema</a>
            <a routerLink="/publico" class="lnd-btn-ghost lg">Ver indicadores públicos</a>
          </div>
        </div>
        <div class="hero-right">
          <div class="preview-card">
            <div class="preview-header">
              <span class="preview-title">Escala de valoración</span>
            </div>
            <div class="preview-rows">
              <div class="preview-row">
                <span class="preview-label">Nivel 4 — supera las expectativas</span>
                <span class="level-chip n4">Supera</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Nivel 3 — desempeño satisfactorio</span>
                <span class="level-chip n3">Bueno</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Nivel 2 — desempeño en desarrollo</span>
                <span class="level-chip n2">En desarrollo</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Nivel 1 — desempeño insatisfactorio</span>
                <span class="level-chip n1">Insatisfactorio</span>
              </div>
            </div>
            <div class="preview-footer">Rúbrica de 4 niveles según criterios ABET</div>
          </div>
        </div>
      </section>

      <section class="features">
        <div class="features-inner">
          <div class="feat">
            <div class="feat-icon orange"><i class="pi pi-check-square"></i></div>
            <h3>Rúbrica interactiva</h3>
            <p>Valoración celda a celda por nivel N1–N4. Reemplaza la hoja de Excel.</p>
          </div>
          <div class="feat">
            <div class="feat-icon purple"><i class="pi pi-chart-line"></i></div>
            <h3>Indicadores en tiempo real</h3>
            <p>Consolidados por programa, Student Outcome y período académico.</p>
          </div>
          <div class="feat">
            <div class="feat-icon orange"><i class="pi pi-users"></i></div>
            <h3>Gestión de roles</h3>
            <p>Flujos diferenciados para docentes, coordinadores y evaluadores.</p>
          </div>
          <div class="feat">
            <div class="feat-icon purple"><i class="pi pi-globe"></i></div>
            <h3>Vista pública ABET</h3>
            <p>Indicadores accesibles sin autenticación para el proceso de acreditación.</p>
          </div>
        </div>
      </section>

      <footer class="lnd-footer">
        <span>© 2026 MESOFTX · Universidad Autónoma de Bucaramanga · Facultad de Ingeniería</span>
      </footer>
    </div>
  `,
  styles: [`
    .landing { min-height: 100vh; display: flex; flex-direction: column; background: var(--page-bg); }

    .lnd-header {
      background: #fff; border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
    }
    .lnd-header-inner {
      max-width: 1200px; margin: 0 auto; padding: 0 32px;
      height: 64px; display: flex; align-items: center; justify-content: space-between;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon {
      width: 38px; height: 38px; background: var(--primary); color: #1A1A2E;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 22px;
    }
    .brand-name { font-weight: 800; font-size: 16px; color: var(--text); line-height: 1.2; }
    .brand-sub  { font-size: 11px; color: var(--text-muted); }
    .lnd-nav { display: flex; align-items: center; gap: 20px; }
    .lnd-link { color: var(--text-muted); font-size: 14px; font-weight: 500; }
    .lnd-link:hover { color: var(--text); }
    .lnd-btn {
      background: var(--primary); color: #1A1A2E; padding: 9px 22px;
      border-radius: var(--radius-sm); font-size: 14px; font-weight: 700;
      text-decoration: none; transition: background 0.15s; display: inline-flex; align-items: center;
    }
    .lnd-btn:hover { background: var(--primary-dark); color: #1A1A2E; }
    .lnd-btn-ghost {
      border: 1px solid var(--border); color: var(--text-muted); padding: 9px 22px;
      border-radius: var(--radius-sm); font-size: 14px; font-weight: 600;
      text-decoration: none; transition: all 0.15s; display: inline-flex; align-items: center;
    }
    .lnd-btn-ghost:hover { border-color: var(--text-muted); color: var(--text); }
    .lnd-btn.lg, .lnd-btn-ghost.lg { padding: 12px 28px; font-size: 15px; }

    /* Hero */
    .hero {
      max-width: 1200px; margin: 0 auto; padding: 80px 32px 60px;
      display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
    }
    .hero-tag {
      font-size: 12px; font-weight: 700; color: var(--primary);
      text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 18px;
    }
    .hero-left h1 {
      font-size: 42px; font-weight: 800; line-height: 1.15;
      color: var(--text); margin-bottom: 20px;
    }
    .hero-left h1 span { color: var(--primary); }
    .hero-left p { font-size: 15px; color: var(--text-muted); line-height: 1.7; margin-bottom: 32px; }
    .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; }

    /* Preview card */
    .hero-right { display: flex; justify-content: center; }
    .preview-card {
      background: #fff; border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 24px; width: 320px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.08);
    }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .preview-title  { font-size: 14px; font-weight: 700; color: var(--text); }
    .lnd-chip { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .lnd-chip.open { background: var(--badge-open-bg); color: var(--badge-open); }
    .preview-rows { display: flex; flex-direction: column; gap: 0; }
    .preview-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid var(--border);
    }
    .preview-row:last-child { border-bottom: none; }
    .preview-label { font-size: 12px; color: var(--text-muted); max-width: 160px; line-height: 1.4; }
    .preview-footer { margin-top: 14px; font-size: 11px; color: var(--text-light); text-align: center; }

    /* Level chips */
    .level-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .level-chip.n1 { background: var(--n1-bg); color: var(--n1-color); }
    .level-chip.n2 { background: var(--n2-bg); color: var(--n2-color); }
    .level-chip.n3 { background: var(--n3-bg); color: var(--n3-color); }
    .level-chip.n4 { background: var(--n4-bg); color: var(--n4-color); }

    /* Features */
    .features { background: #fff; border-top: 1px solid var(--border); padding: 60px 32px; }
    .features-inner {
      max-width: 1200px; margin: 0 auto;
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
    }
    .feat { padding: 24px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--page-bg); }
    .feat-icon {
      width: 44px; height: 44px; border-radius: var(--radius-sm); font-size: 20px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
    }
    .feat-icon.orange { background: rgba(255,165,2,0.1); color: var(--primary); }
    .feat-icon.purple { background: rgba(124,58,237,0.1); color: var(--accent); }
    .feat h3 { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
    .feat p  { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

    .lnd-footer {
      border-top: 1px solid var(--border); padding: 20px 32px;
      text-align: center; font-size: 12px; color: var(--text-muted);
    }

    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; padding: 48px 24px; }
      .hero-right { display: none; }
      .hero-left h1 { font-size: 30px; }
      .features-inner { grid-template-columns: repeat(2,1fr); }
    }
  `]
})
export class LandingComponent {}
