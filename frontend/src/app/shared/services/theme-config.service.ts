import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MESOFTX_THEME } from '../../config/themes';

@Injectable({ providedIn: 'root' })
export class ThemeConfigService {
  private readonly document = inject(DOCUMENT);
  apply(): void {
    for (const [token, value] of Object.entries(MESOFTX_THEME)) {
      this.document.documentElement.style.setProperty(token, value);
    }
  }
}
