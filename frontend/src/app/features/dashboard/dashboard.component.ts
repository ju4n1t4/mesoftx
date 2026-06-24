import { Component } from '@angular/core';

import { MetricCardComponent } from '../../shared/molecules/metric-card/metric-card.component';
import { ModulePageComponent } from '../../shared/templates/module-page/module-page.component';

@Component({
  selector: 'mx-dashboard',
  standalone: true,
  imports: [MetricCardComponent, ModulePageComponent],
  template: `
    <mx-module-page
      eyebrow="Vista general"
      title="Dashboard MesoftX"
      description="Panel inicial alineado a la arquitectura de microservicios: gestion de usuarios, configuracion academica y valoracion ABET."
    />
    <section class="metrics">
      <mx-metric-card label="Microservicios" value="2" detail="User_MS y Assesment_MS" />
      <mx-metric-card label="Bases de datos" value="2" detail="users_db y assesment_mesoftx_db" />
      <mx-metric-card label="Modulos FE" value="2" detail="Gestion de Usuarios y Assesment" />
    </section>
    <section class="architecture">
      <h2>Flujo principal</h2>
      <p>Usuarios institucionales ingresan a la SPA Angular, consumen servicios REST y gestionan informacion persistida en PostgreSQL.</p>
    </section>
  `,
  styles: [`
    .metrics { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .architecture {
      background: var(--mx-ink);
      border-radius: 8px;
      color: #fff;
      margin-top: 18px;
      padding: 24px;
    }
    .architecture h2 { font: 800 22px Inter, system-ui, sans-serif; margin-bottom: 8px; }
    .architecture p { color: #c9cdd6; font: 500 14px/1.6 Inter, system-ui, sans-serif; }
    @media (max-width: 900px) {
      .metrics { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent {}
