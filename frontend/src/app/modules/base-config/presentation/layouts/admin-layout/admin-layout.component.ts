import { SidebarNavComponent } from '../../../../../shared/ui/organisms/sidebar-nav/sidebar-nav.component';
import { WorkspaceShellComponent } from '../../../../../shared/ui/templates/workspace-shell/workspace-shell.component';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../auth/application/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [SidebarNavComponent, WorkspaceShellComponent, RouterOutlet, CommonModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  navItems: NavItem[] = [
    { label: 'Integraciones', icon: 'pi-link', route: '/admin/integraciones' },
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
