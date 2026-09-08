import { Injectable, signal } from '@angular/core';

import { DEFAULT_THEME_ID, MESOFTX_THEMES, MesoftxTheme } from '../../config/themes';

const THEME_KEY = 'mesoftx_theme';

@Injectable({ providedIn: 'root' })
export class ThemeConfigService {
  readonly themes = MESOFTX_THEMES;
  readonly activeTheme = signal<MesoftxTheme>(this.resolveTheme(localStorage.getItem(THEME_KEY)));

  applyActiveTheme(): void {
    this.applyTheme(this.activeTheme());
  }

  setTheme(themeId: string): void {
    const theme = this.resolveTheme(themeId);
    localStorage.setItem(THEME_KEY, theme.id);
    this.activeTheme.set(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: MesoftxTheme): void {
    const root = document.documentElement;
    Object.entries(theme.tokens).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  private resolveTheme(themeId: string | null): MesoftxTheme {
    return this.themes.find((theme) => theme.id === themeId) ?? this.themes.find((theme) => theme.id === DEFAULT_THEME_ID) ?? this.themes[0];
  }
}
