import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeConfigService } from './core/services/theme_config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent {
  private readonly themeConfigService = inject(ThemeConfigService);

  constructor() {
    this.themeConfigService.applyActiveTheme();
  }
}
