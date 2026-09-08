import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavigationItem {
  label: string;
  icon: string;
  path: string;
  roles: string[];
}

@Component({
  selector: 'mx-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Output() logout = new EventEmitter<void>();

  private readonly currentRole = 'all';
  readonly items: NavigationItem[] = [
    { label: 'Dashboard', icon: 'pi-home', path: '/dashboard', roles: ['all', 'administrador', 'coordinador', 'docente', 'evaluador'] },
    { label: 'Programas', icon: 'pi-list', path: '/programas', roles: ['all', 'administrador', 'coordinador'] },
    { label: 'Usuarios', icon: 'pi-users', path: '/usuarios', roles: ['all', 'administrador', 'coordinador'] },
    { label: 'Student Outcomes', icon: 'pi-chart-line', path: '/student-outcomes', roles: ['all', 'administrador', 'coordinador'] },
    { label: 'Valoraciones', icon: 'pi-check-square', path: '/dashboard', roles: ['all', 'coordinador', 'docente', 'evaluador'] },
    { label: 'Configuracion', icon: 'pi-cog', path: '/configuracion', roles: ['all', 'administrador', 'coordinador'] }
  ];

  readonly visibleItems = this.items.filter((item) => item.roles.includes(this.currentRole));
}
