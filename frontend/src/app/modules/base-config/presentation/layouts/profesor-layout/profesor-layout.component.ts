import { SidebarNavComponent } from '../../../../../shared/ui/organisms/sidebar-nav/sidebar-nav.component';
import { WorkspaceShellComponent } from '../../../../../shared/ui/templates/workspace-shell/workspace-shell.component';
import { InputAtom } from '../../../../../shared/ui/atoms/input/input.directive';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../auth/application/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-profesor-layout',
  standalone: true,
  imports: [SidebarNavComponent, WorkspaceShellComponent, InputAtom, RouterOutlet, CommonModule],
  templateUrl: './profesor-layout.component.html',
  styleUrl: './profesor-layout.component.scss'
})
export class ProfesorLayoutComponent {

  navItems: (NavItem & { exact?: boolean })[] = [
    { label: 'Dashboard',            icon: 'pi-home',             route: '/profesor/dashboard',    exact: true  },
    { label: 'Mis cursos',            icon: 'pi-book',             route: '/profesor/mis-cursos',   exact: false },
    { label: 'Valorar',               icon: 'pi-check-square',     route: '/profesor/valorar',      exact: false },
    { label: 'Mis indicadores',       icon: 'pi-chart-line',       route: '/profesor/indicadores',   exact: false },
    { label: 'Acreditación',          icon: 'pi-globe',            route: '/profesor/inicio',        exact: true  },
  ];

  constructor(private auth: AuthService) {}
  fullName() { return this.auth.user()?.name?.trim() || 'Profesor'; }
  initial()  { return (this.auth.user()?.name?.[0] ?? 'P').toUpperCase(); }
  logout()   { this.auth.logout(); }
}
