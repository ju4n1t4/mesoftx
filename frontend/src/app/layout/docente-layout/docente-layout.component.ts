import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-docente-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">M</div>
          <div class="brand-info">
            <span class="brand-name">MESOFTX</span>
            <span class="brand-sub">Facultad de Ingeniería</span>
          </div>
        </div>

        <div class="sidebar-profile">
          <div class="profile-avatar">{{ initial() }}</div>
          <div class="profile-info">
            <span class="profile-name">{{ fullName() }}</span>
            <span class="profile-role">DOCENTE</span>
          </div>
        </div>

        <div class="sidebar-section-label">MENÚ PRINCIPAL</div>

        <nav class="sidebar-nav">
          <a *ngFor="let item of navItems"
             [routerLink]="item.route"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
             class="nav-item"
             [title]="item.label">
            <i [class]="'pi ' + item.icon"></i>
            <span>{{ item.label }}</span>
          </a>
          <button class="nav-item logout-item" (click)="logout()">
            <i class="pi pi-sign-out"></i>
            <span>Cerrar sesión</span>
          </button>
        </nav>

        <div class="sidebar-period">
          <div class="period-label">PERIODO ACTIVO</div>
          <div class="period-value">202610</div>
          <div class="period-status"><span class="dot green"></span>Abierto · cierre 7 jun</div>
        </div>
      </aside>

      <div class="main-wrapper">
        <header class="topbar">
          <div class="topbar-breadcrumb">
            <span class="bc-item">Inicio</span>
            <i class="pi pi-chevron-right bc-sep"></i>
            <span class="bc-current">Panel</span>
          </div>
          <div class="topbar-search">
            <i class="pi pi-search search-icon"></i>
            <input type="text" placeholder="Buscar curso, estudiante…" class="search-input" />
          </div>
          <div class="topbar-avatar" title="{{ fullName() }}">{{ initial() }}</div>
        </header>
        <main class="page-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell { display: flex; height: 100vh; overflow: hidden; }

    .sidebar {
      width: 220px; min-width: 220px; background: var(--sidebar-bg);
      display: flex; flex-direction: column; border-right: 1px solid #2E2D40;
    }
    .sidebar-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 16px 14px; border-bottom: 1px solid #2E2D40;
    }
    .brand-icon {
      width: 36px; height: 36px; background: var(--primary); color: #1A1A2E;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px; flex-shrink: 0;
    }
    .brand-name { font-weight: 800; font-size: 14px; color: #fff; display: block; line-height: 1.2; }
    .brand-sub  { font-size: 10px; color: var(--sidebar-text); display: block; }

    .sidebar-profile {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-bottom: 1px solid #2E2D40;
    }
    .profile-avatar {
      width: 34px; height: 34px; border-radius: 50%; background: var(--accent);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px; flex-shrink: 0;
    }
    .profile-name { font-size: 12px; font-weight: 600; color: #fff; display: block; line-height: 1.2; }
    .profile-role {
      font-size: 9px; font-weight: 700; color: var(--primary);
      background: rgba(255,165,2,0.12); padding: 1px 7px; border-radius: 3px;
      display: inline-block; margin-top: 3px; letter-spacing: 0.05em;
    }

    .sidebar-section-label {
      font-size: 9px; font-weight: 700; color: #4B5563;
      letter-spacing: 0.08em; padding: 14px 16px 5px;
    }
    .sidebar-nav { flex: 1; padding: 0 8px; display: flex; flex-direction: column; gap: 1px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: var(--radius-sm);
      color: var(--sidebar-text); font-size: 13px; font-weight: 500;
      text-decoration: none; transition: background 0.15s, color 0.15s;
    }
    .nav-item i { font-size: 14px; flex-shrink: 0; }
    .nav-item:hover { background: var(--sidebar-hover); color: #fff; }
    .nav-item.active { background: rgba(255,165,2,0.12); color: var(--primary); font-weight: 600; }

    .sidebar-period {
      padding: 14px 16px; border-top: 1px solid #2E2D40;
    }
    .period-label { font-size: 9px; font-weight: 700; color: #4B5563; letter-spacing: 0.08em; margin-bottom: 3px; }
    .period-value { font-size: 22px; font-weight: 800; color: #fff; line-height: 1.1; }
    .period-status { font-size: 11px; color: var(--sidebar-text); margin-top: 4px; display: flex; align-items: center; gap: 5px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .dot.green { background: var(--badge-open); }

    .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--page-bg); }
    .topbar {
      height: var(--topbar-height); background: var(--topbar-bg);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 16px; padding: 0 24px; flex-shrink: 0;
    }
    .topbar-breadcrumb { display: flex; align-items: center; gap: 8px; flex: 1; }
    .bc-item    { font-size: 13px; color: var(--text-muted); }
    .bc-sep     { font-size: 10px; color: var(--text-light); }
    .bc-current { font-size: 13px; font-weight: 600; color: var(--text); }
    .topbar-search { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 11px; color: var(--text-light); font-size: 12px; }
    .search-input {
      width: 200px; padding: 8px 12px 8px 30px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--radius-sm); font-size: 13px; color: var(--text); font-family: inherit;
    }
    .search-input:focus { outline: none; border-color: var(--primary); }
    .search-input::placeholder { color: var(--text-light); }
    .topbar-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: var(--accent);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 12px;
    }
    .logout-item {
      width: 100%; text-align: left; background: none; font-family: inherit;
      color: #EF6B6B;
    }
    .logout-item:hover { background: rgba(239,68,68,0.12) !important; color: #F87171 !important; }
    .page-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
  `]
})
export class DocenteLayoutComponent {

  navItems: (NavItem & { exact?: boolean })[] = [
    { label: 'Inicio · Acreditación', icon: 'pi-globe',            route: '/docente/inicio',        exact: true  },
    { label: 'Dashboard',             icon: 'pi-home',             route: '/docente/dashboard',     exact: false },
    { label: 'Registrar valoración',  icon: 'pi-check-square',     route: '/docente/valoraciones',  exact: false },
    { label: 'Mis estudiantes',       icon: 'pi-users',            route: '/docente/mis-estudiantes', exact: false },
    { label: 'Mis indicadores',       icon: 'pi-chart-line',       route: '/docente/indicadores',   exact: false },
    { label: 'Ayuda y soporte',       icon: 'pi-question-circle',  route: '/docente/soporte',       exact: false },
  ];

  constructor(private auth: AuthService) {}
  fullName() { return `Prof. ${this.auth.user()?.name ?? ''} ${this.auth.user()?.surname ?? ''}`.trim(); }
  initial()  { return (this.auth.user()?.name?.[0] ?? 'D').toUpperCase(); }
  logout()   { this.auth.logout(); }
}
