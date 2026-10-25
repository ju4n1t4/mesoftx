import { SidebarNavComponent } from '../../../../../shared/ui/organisms/sidebar-nav/sidebar-nav.component';
import { WorkspaceShellComponent } from '../../../../../shared/ui/templates/workspace-shell/workspace-shell.component';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../auth/application/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-auditor-layout',
  standalone: true,
  imports: [SidebarNavComponent, WorkspaceShellComponent, RouterOutlet, CommonModule],
  templateUrl: './auditor-layout.component.html',
  styleUrl: './auditor-layout.component.scss',
})
export class AuditorLayoutComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi-home', route: '/auditor/dashboard' },
    { label: 'Indicadores y rúbricas', icon: 'pi-chart-bar', route: '/auditor/indicadores' },
  ];
  constructor(private auth: AuthService) {}
  fullName() { return this.auth.user()?.name?.trim() || 'Auditor'; }
  initial()  { return (this.auth.user()?.name?.[0] ?? 'A').toUpperCase(); }
  logout()   { this.auth.logout(); }
}
