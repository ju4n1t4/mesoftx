import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

import { MESOFTX_THEME, MesoftxTheme } from '../../config/themes_config';

@Injectable({ providedIn: 'root' })
export class ThemeConfigService {
  private activeTheme = MESOFTX_THEME;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  applyTheme(theme: MesoftxTheme = MESOFTX_THEME): void {
    this.activeTheme = theme;
    const root = this.document.documentElement;
    Object.entries(theme.colors).forEach(([token, value]) => {
      root.style.setProperty(`--mx-${this.toKebabCase(token)}`, value);
    });
  }

  getColor(token: keyof typeof MESOFTX_THEME.colors): string {
    return this.activeTheme.colors[token];
  }

  private toKebabCase(value: string): string {
    return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
  }
}
