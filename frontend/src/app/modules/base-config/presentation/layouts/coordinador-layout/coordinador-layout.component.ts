import { SidebarNavComponent } from '../../../../../shared/ui/organisms/sidebar-nav/sidebar-nav.component';
import { WorkspaceShellComponent } from '../../../../../shared/ui/templates/workspace-shell/workspace-shell.component';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../auth/application/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-coordinador-layout',
  standalone: true,
  imports: [SidebarNavComponent, WorkspaceShellComponent, RouterOutlet, CommonModule],
  templateUrl: './coordinador-layout.component.html',
  styleUrl: './coordinador-layout.component.scss'
})
export class CoordinadorLayoutComponent {

  // Menú del Coordinador de Acreditación, según sus requisitos: gestión
  // académica (profesores, programas, materias, asignación, student outcomes,
  // programación), dashboards, gráficas de indicadores y resultados de rúbricas.
  // El Administrativo y el Auditor tienen sus propios módulos (/admin, /auditor).
  navItems: NavItem[] = [
    { label: 'Dashboard',         icon: 'pi-home',         route: '/coordinador/dashboard' },
    { label: 'Profesores',        icon: 'pi-users',        route: '/coordinador/profesores' },
    { label: 'Programas',         icon: 'pi-building',     route: '/coordinador/programas' },
    { label: 'Materias',          icon: 'pi-book',         route: '/coordinador/materias' },
    { label: 'Asignar NRC',       icon: 'pi-sitemap',      route: '/coordinador/asignacion-materias' },
    { label: 'Student Outcomes',  icon: 'pi-list',         route: '/coordinador/student-outcomes' },
    { label: 'Programación',      icon: 'pi-calendar',     route: '/coordinador/programacion' },
    { label: 'Avance de valoración', icon: 'pi-chart-line', route: '/coordinador/avance' },
    { label: 'Indicadores',       icon: 'pi-chart-bar',    route: '/coordinador/indicadores' },
    { label: 'Resultados rúbricas', icon: 'pi-check-square', route: '/coordinador/valoraciones' },
  ];

  constructor(private auth: AuthService) {}
  fullName() { return `${this.auth.user()?.name ?? ''}`.trim() || 'Coordinador'; }
  initial()  { return (this.auth.user()?.name?.[0] ?? 'C').toUpperCase(); }
  logout()   { this.auth.logout(); }
}
