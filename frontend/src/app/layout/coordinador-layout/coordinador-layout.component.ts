import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-coordinador-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">M</div>
          <div class="brand-info">
            <span class="brand-name">MESOFTX</span>
            <span class="brand-sub">Coordinación ABET</span>
          </div>
        </div>

        <div class="coord-badge-wrap">
          <span class="coord-badge"><i class="pi pi-shield"></i> Coordinador de Acreditación</span>
        </div>

        <div class="sidebar-profile">
          <div class="profile-avatar">{{ initial() }}</div>
          <div class="profile-info">
            <span class="profile-name">{{ fullName() }}</span>
            <div class="online-row"><span class="dot green"></span><span class="online-label">En línea</span></div>
          </div>
        </div>

        <div class="sidebar-section-label">PANEL PRINCIPAL</div>

        <nav class="sidebar-nav">
          <a *ngFor="let item of navItems"
             [routerLink]="item.route"
             routerLinkActive="active"
             class="nav-item">
            <i [class]="'pi ' + item.icon"></i>
            <span>{{ item.label }}</span>
          </a>
          <button class="nav-item logout-item" (click)="logout()">
            <i class="pi pi-sign-out"></i>
            <span>Cerrar sesión</span>
          </button>
        </nav>

        <div class="sys-status">
          <div class="sys-label">ESTADO DEL SISTEMA</div>
          <div class="sys-row"><span>Base de datos</span><span class="ok">Operativo</span></div>
          <div class="sys-row"><span>Power BI</span><span class="ok">Conectado</span></div>
        </div>
      </aside>

      <div class="main-wrapper">
        <header class="topbar">
          <div class="topbar-breadcrumb">
            <span class="bc-item">Gestión</span>
            <i class="pi pi-chevron-right bc-sep"></i>
            <span class="bc-current">Panel</span>
          </div>
          <div class="topbar-right">
            <span class="period-chip">Periodo 202610 · Activo</span>
            <div class="topbar-avatar" title="{{ fullName() }}">{{ initial() }}</div>
          </div>
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
      width: 36px; height: 36px; background: var(--accent); color: #fff;
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px; flex-shrink: 0;
    }
    .brand-name { font-weight: 800; font-size: 14px; color: #fff; display: block; line-height: 1.2; }
    .brand-sub  { font-size: 10px; color: var(--sidebar-text); display: block; }

    .coord-badge-wrap { padding: 10px 16px 0; }
    .coord-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 10px; font-weight: 700; color: var(--primary);
      background: rgba(255,165,2,0.1); border: 1px solid rgba(255,165,2,0.2);
      padding: 4px 10px; border-radius: 20px;
    }
    .coord-badge i { font-size: 10px; }

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
    .online-row { display: flex; align-items: center; gap: 5px; margin-top: 3px; }
    .online-label { font-size: 11px; color: var(--sidebar-text); }
    .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .dot.green { background: var(--badge-open); }

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

    .sys-status { padding: 14px 16px; border-top: 1px solid #2E2D40; }
    .sys-label { font-size: 9px; font-weight: 700; color: #4B5563; letter-spacing: 0.08em; margin-bottom: 8px; }
    .sys-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--sidebar-text); margin-bottom: 4px; }
    .ok { color: var(--badge-open); font-weight: 600; }

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
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .period-chip {
      font-size: 12px; font-weight: 600; color: var(--primary);
      background: rgba(255,165,2,0.1); border: 1px solid rgba(255,165,2,0.2);
      padding: 4px 12px; border-radius: 20px;
    }
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
    .page-content { flex: 1; overflow-y: auto; }
  `]
})
export class CoordinadorLayoutComponent {

  navItems: NavItem[] = [
    { label: 'Dashboard',        icon: 'pi-home',         route: '/coordinador/dashboard'        },
    { label: 'Programas',        icon: 'pi-building',     route: '/coordinador/programas'        },
    { label: 'Docentes',         icon: 'pi-users',        route: '/coordinador/docentes'         },
    { label: 'Student Outcomes', icon: 'pi-list',         route: '/coordinador/student-outcomes' },
    { label: 'Valoraciones',     icon: 'pi-check-square', route: '/coordinador/valoraciones'     },
    { label: 'Configuración',    icon: 'pi-cog',          route: '/coordinador/configuracion'    },
  ];

  constructor(private auth: AuthService) {}
  fullName() { return `Prof. ${this.auth.user()?.name ?? ''} ${this.auth.user()?.surname ?? ''}`.trim(); }
  initial()  { return (this.auth.user()?.name?.[0] ?? 'C').toUpperCase(); }
  logout()   { this.auth.logout(); }
}
