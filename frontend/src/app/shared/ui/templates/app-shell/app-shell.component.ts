import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthSessionService } from '../../../../modules/auth/application/services/auth-session.service';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { SidebarComponent } from '../../organisms/sidebar/sidebar.component';

@Component({
  selector: 'mx-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, BadgeComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private readonly authSession = inject(AuthSessionService);

  logout(): void {
    this.authSession.logout();
  }
}
