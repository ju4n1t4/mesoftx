import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { ButtonComponent } from '../shared/atoms/button/button.component';

@Component({
  selector: 'mx-app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ButtonComponent],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand__mark">M</div>
          <div>
            <strong>MESOFTX</strong>
            <span>Valoracion ABET</span>
          </div>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/users" routerLinkActive="active">Gestion de Usuarios</a>
          <a routerLink="/assesment" routerLinkActive="active">Assesment</a>
        </nav>
        <mx-button variant="secondary" (clicked)="authService.logout()">Cerrar sesion</mx-button>
      </aside>
      <main>
        <header class="topbar">
          <div>
            <span>Microservicios activos</span>
            <strong>User_MS - Assesment_MS</strong>
          </div>
        </header>
        <section class="content">
          <router-outlet />
        </section>
      </main>
    </div>
  `,
  styles: [`
    .shell {
      background: var(--mx-surface-alt);
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      min-height: 100vh;
    }
    .sidebar {
      background: var(--mx-ink);
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 28px;
      padding: 26px;
    }
    .brand {
      align-items: center;
      display: flex;
      gap: 13px;
    }
    .brand__mark {
      align-items: center;
      background: var(--mx-primary);
      border-radius: 12px;
      color: var(--mx-ink);
      display: flex;
      font: 900 24px Inter, system-ui, sans-serif;
      height: 48px;
      justify-content: center;
      width: 48px;
    }
    .brand strong { display: block; font: 900 18px Inter, system-ui, sans-serif; }
    .brand span { color: #9aa0ad; display: block; font: 600 12px Inter, system-ui, sans-serif; margin-top: 3px; }
    nav { display: grid; gap: 8px; }
    nav a {
      border-radius: 10px;
      color: #9aa0ad;
      font: 700 13px Inter, system-ui, sans-serif;
      padding: 12px 13px;
      text-decoration: none;
    }
    nav a.active, nav a:hover { background: var(--mx-primary); color: #fff; }
    main { min-width: 0; }
    .topbar {
      align-items: center;
      background: #fff;
      border-bottom: 1px solid var(--mx-border);
      display: flex;
      justify-content: flex-end;
      min-height: 72px;
      padding: 0 28px;
    }
    .topbar span { color: var(--mx-muted); display: block; font: 700 11px Inter, system-ui, sans-serif; text-transform: uppercase; }
    .topbar strong { color: var(--mx-ink); font: 800 14px Inter, system-ui, sans-serif; }
    .content { padding: 28px; }
    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar { position: static; }
    }
  `]
})
export class AppShellComponent {
  constructor(readonly authService: AuthService) {}
}
