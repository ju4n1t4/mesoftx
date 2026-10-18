import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (auth.isDemo()) {
      <div class="demo-banner" role="status">MODO EXPOSICIÓN · datos de ejemplo · sin autenticación</div>
    }
  `,
  styles: [`
    .demo-banner { position: fixed; left: 12px; bottom: 12px; z-index: 2000; background: #9A3412; color: #fff;
      font: 600 12px/1 Inter, sans-serif; padding: 8px 12px; border-radius: 999px; box-shadow: 0 2px 8px rgba(0,0,0,.25);
      pointer-events: none; }
  `],
})
export class AppComponent {
  auth = inject(AuthService);
}
