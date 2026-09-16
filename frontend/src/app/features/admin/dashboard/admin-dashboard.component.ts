import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-area">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Gestiona los catálogos principales y la configuración base del sistema.</p>
      </div>

      <div class="quick-grid">
        <a *ngFor="let item of items" class="quick-card" [routerLink]="item.route">
          <div class="quick-icon"><i [class]="'pi ' + item.icon"></i></div>
          <div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.description }}</p>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .quick-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      color: var(--text);
      text-decoration: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .quick-card:hover {
      border-color: var(--accent);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    }

    .quick-icon {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(124, 58, 237, 0.1);
      color: var(--accent);
      flex-shrink: 0;
    }

    .quick-icon i { font-size: 18px; }
    h2 { font-size: 15px; margin: 0 0 4px; }
    p { margin: 0; color: var(--text-muted); font-size: 13px; line-height: 1.45; }

    @media (max-width: 820px) {
      .quick-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminDashboardComponent {
  items = [
    { title: 'Perfiles y permisos', description: 'Administra roles y permisos agrupados por módulo.', icon: 'pi-shield', route: '/admin/perfiles' },
    { title: 'Usuarios', description: 'Crea, edita y activa usuarios del sistema.', icon: 'pi-users', route: '/admin/usuarios' },
    { title: 'Periodos', description: 'Define el periodo académico activo y su histórico.', icon: 'pi-calendar', route: '/admin/periodos' },
    { title: 'Facultades', description: 'Gestiona las facultades disponibles para los procesos ABET.', icon: 'pi-building', route: '/admin/facultades' },
  ];
}
