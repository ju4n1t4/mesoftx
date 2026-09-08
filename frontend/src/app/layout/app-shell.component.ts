import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { BadgeComponent } from '../shared/atoms/badge/badge.component';
import { SidebarComponent } from '../shared/organisms/sidebar/sidebar.component';

@Component({
  selector: 'mx-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, BadgeComponent],
  template: `
    <div class="shell">
      <mx-sidebar (logout)="logout()" />
      <main>
        <header>
          <div class="crumb">Inicio / <strong>Dashboard</strong></div>
          <div class="status">
            <mx-badge tone="warning">Periodo 202610 · Activo</mx-badge>
            <span class="avatar">OR</span>
          </div>
        </header>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell {
      background: #f4f5f7;
      display: flex;
      min-height: 100vh;
    }
    main {
      flex: 1;
      min-width: 0;
    }
    header {
      align-items: center;
      background: #fff;
      border-bottom: 1px solid var(--mx-border);
      display: flex;
      justify-content: space-between;
      min-height: 62px;
      padding: 0 24px;
    }
    .crumb {
      color: var(--mx-muted);
      font-size: 12px;
      font-weight: 700;
    }
    .crumb strong {
      color: var(--mx-ink);
    }
    .status {
      align-items: center;
      display: flex;
      gap: 12px;
    }
    .avatar {
      align-items: center;
      background: var(--mx-secondary);
      border-radius: 999px;
      color: #fff;
      display: inline-flex;
      font-size: 12px;
      font-weight: 800;
      height: 34px;
      justify-content: center;
      width: 34px;
    }
    @media (max-width: 860px) {
      .shell {
        display: block;
      }
      header {
        padding: 0 16px;
      }
    }
  `]
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
