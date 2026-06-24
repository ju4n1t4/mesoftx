import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeConfigService } from './core/services/theme_config.service';

@Component({
  selector: 'mx-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent implements OnInit {
  constructor(private readonly themeConfigService: ThemeConfigService) {}

  ngOnInit(): void {
    this.themeConfigService.applyTheme();
  }
}
