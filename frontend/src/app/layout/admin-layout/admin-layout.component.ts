import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">M</div>
          <div class="brand-info">
            <span class="brand-name">MESOFTX</span>
            <span class="brand-sub">Administración</span>
          </div>
        </div>
        <div class="badge-wrap"><span class="role-badge"><i class="pi pi-cog"></i> Administrador</span></div>
        <div class="sidebar-profile">
          <div class="profile-avatar">{{ initial() }}</div>
          <div class="profile-info"><span class="profile-name">{{ fullName() }}</span></div>
        </div>
        <div class="sidebar-section-label">GESTIÓN</div>
        <nav class="sidebar-nav">
          <a *ngFor="let item of navItems" [routerLink]="item.route" routerLinkActive="active" class="nav-item">
            <i [class]="'pi ' + item.icon"></i><span>{{ item.label }}</span>
          </a>
        </nav>
        <div class="sidebar-bottom">
          <a [routerLink]="'/admin/soporte'" routerLinkActive="active" class="nav-item">
            <i class="pi pi-question-circle"></i><span>Ayuda y soporte</span>
          </a>
          <button class="nav-item logout-item" (click)="logout()"><i class="pi pi-sign-out"></i><span>Cerrar sesión</span></button>
        </div>
      </aside>
      <div class="main-wrapper">
        <header class="topbar">
          <span class="bc-current">Administración del sistema</span>
          <div class="topbar-avatar" title="{{ fullName() }}">{{ initial() }}</div>
        </header>
        <main class="page-content"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: [`
    .shell { display: flex; height: 100vh; overflow: hidden; }
    .sidebar { width: 220px; min-width: 220px; background: var(--sidebar-bg); display: flex; flex-direction: column; border-right: 1px solid #2E2D40; }
    .sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 18px 16px 14px; border-bottom: 1px solid #2E2D40; }
    .brand-icon { width: 36px; height: 36px; background: var(--accent); color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
    .brand-name { font-weight: 800; font-size: 14px; color: #fff; display: block; line-height: 1.2; }
    .brand-sub { font-size: 10px; color: var(--sidebar-text); display: block; }
    .badge-wrap { padding: 10px 16px 0; }
    .role-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--accent); background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.25); padding: 4px 10px; border-radius: 20px; }
    .sidebar-profile { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #2E2D40; }
    .profile-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
    .profile-name { font-size: 12px; font-weight: 600; color: #fff; }
    .sidebar-section-label { font-size: 9px; font-weight: 700; color: #4B5563; letter-spacing: 0.08em; padding: 14px 16px 5px; }
    .sidebar-nav { flex: 1; padding: 0 8px; display: flex; flex-direction: column; gap: 1px; }
    .sidebar-bottom { padding: 0 8px 10px; display: flex; flex-direction: column; gap: 1px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--radius-sm); color: var(--sidebar-text); font-size: 13px; font-weight: 500; text-decoration: none; }
    .nav-item i { font-size: 14px; }
    .nav-item:hover { background: var(--sidebar-hover); color: #fff; }
    .nav-item.active { background: rgba(124,58,237,0.15); color: #fff; font-weight: 600; }
    .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--page-bg); }
    .topbar { height: var(--topbar-height); background: var(--topbar-bg); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
    .bc-current { font-size: 13px; font-weight: 600; color: var(--text); }
    .topbar-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
    .logout-item { width: 100%; text-align: left; background: none; font-family: inherit; color: #EF6B6B; }
    .logout-item:hover { background: rgba(239,68,68,0.12) !important; color: #F87171 !important; }
    .page-content { flex: 1; overflow-y: auto; }
  `],
})
export class AdminLayoutComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/admin/dashboard' },
    { label: 'Perfiles y permisos', icon: 'pi-shield', route: '/admin/perfiles' },
    { label: 'Usuarios',            icon: 'pi-users',  route: '/admin/usuarios' },
    { label: 'Periodos',            icon: 'pi-calendar', route: '/admin/periodos' },
    { label: 'Facultades',          icon: 'pi-building', route: '/admin/facultades' },
  ];
  constructor(private auth: AuthService) {}
  fullName() { return this.auth.user()?.name?.trim() || 'Administrador'; }
  initial()  { return (this.auth.user()?.name?.[0] ?? 'A').toUpperCase(); }
  logout()   { this.auth.logout(); }
}
