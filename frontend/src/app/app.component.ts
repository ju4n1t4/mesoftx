import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeConfigService } from './shared/services/theme-config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly themeConfigService = inject(ThemeConfigService);

  constructor() {
    this.themeConfigService.applyActiveTheme();
  }
}
