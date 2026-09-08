import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavigationItem {
  label: string;
  icon: string;
  path: string;
  disabled?: boolean;
}

@Component({
  selector: 'mx-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">M</span>
        <div>
          <strong>MESOFTX</strong>
          <small>Coordinacion ABET</small>
        </div>
      </div>

      <div class="profile">
        <span>OR</span>
        <div>
          <strong>Prof. Oscar Rueda</strong>
          <small>En linea</small>
        </div>
      </div>

      <nav aria-label="Menu principal">
        <span class="section-label">Panel principal</span>
        <a *ngFor="let item of items" [routerLink]="item.disabled ? null : item.path" routerLinkActive="active" [class.disabled]="item.disabled">
          <i class="pi" [ngClass]="item.icon"></i>
          {{ item.label }}
        </a>
      </nav>

      <button class="logout" type="button" (click)="logout.emit()">
        <i class="pi pi-sign-out"></i>
        Salir
      </button>

      <div class="system">
        <span>Estado del sistema</span>
        <p>Base de datos <strong>Operativa</strong></p>
        <p>Power BI <strong>Conectado</strong></p>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      background: var(--mx-sidebar);
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 22px;
      min-height: 100vh;
      padding: 18px 14px;
      width: 236px;
    }
    .brand,
    .profile {
      align-items: center;
      display: flex;
      gap: 12px;
    }
    .brand-mark,
    .profile span {
      align-items: center;
      border-radius: 8px;
      display: inline-flex;
      font-weight: 800;
      height: 36px;
      justify-content: center;
      min-width: 36px;
    }
    .brand-mark {
      background: var(--mx-primary);
      color: var(--mx-ink);
    }
    .profile {
      background: rgba(255, 255, 255, .06);
      border: 1px solid rgba(255, 255, 255, .08);
      border-radius: 8px;
      padding: 12px;
    }
    .profile span {
      background: var(--mx-secondary);
      color: #fff;
      font-size: 12px;
    }
    strong {
      display: block;
      font-size: 13px;
    }
    small {
      color: #aaa6b8;
      display: block;
      font-size: 11px;
      margin-top: 2px;
    }
    nav {
      display: grid;
      gap: 7px;
    }
    .section-label {
      color: #777286;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .08em;
      margin: 5px 0;
      text-transform: uppercase;
    }
    a,
    .logout {
      align-items: center;
      border-radius: 8px;
      display: flex;
      gap: 10px;
      min-height: 40px;
      padding: 0 12px;
    }
    a {
      color: #c9c5d4;
      font-size: 13px;
      font-weight: 700;
    }
    a.active {
      background: var(--mx-primary);
      color: #fff;
    }
    a.disabled {
      cursor: default;
      opacity: .45;
    }
    .logout {
      background: transparent;
      border: 0;
      color: #c9c5d4;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      margin-top: auto;
      text-align: left;
    }
    .system {
      border: 1px solid rgba(255, 255, 255, .08);
      border-radius: 8px;
      color: #aaa6b8;
      font-size: 11px;
      padding: 12px;
    }
    .system span {
      display: block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .08em;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .system p {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
    .system strong {
      color: #22c55e;
      font-size: 11px;
    }
    @media (max-width: 860px) {
      .sidebar {
        min-height: auto;
        width: 100%;
      }
      .system {
        display: none;
      }
    }
  `]
})
export class SidebarComponent {
  @Output() logout = new EventEmitter<void>();

  readonly items: NavigationItem[] = [
    { label: 'Dashboard', icon: 'pi-home', path: '/dashboard' },
    { label: 'Programas', icon: 'pi-list', path: '/dashboard', disabled: true },
    { label: 'Docentes', icon: 'pi-users', path: '/dashboard', disabled: true },
    { label: 'Student Outcomes', icon: 'pi-chart-line', path: '/dashboard', disabled: true },
    { label: 'Valoraciones', icon: 'pi-check-square', path: '/dashboard', disabled: true },
    { label: 'Configuracion', icon: 'pi-cog', path: '/dashboard', disabled: true }
  ];
}
