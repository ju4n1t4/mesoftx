export interface MesoftxTheme {
  id: string;
  name: string;
  tokens: Record<string, string>;
}

export const MESOFTX_THEMES: MesoftxTheme[] = [
  {
    id: 'institutional',
    name: 'Institucional UNAB',
    tokens: {
      '--mx-primary': '#ffa502',
      '--mx-primary-strong': '#e58b0c',
      '--mx-secondary': '#7c3aed',
      '--mx-success': '#16a34a',
      '--mx-danger': '#dc2626',
      '--mx-warning': '#eab308',
      '--mx-ink': '#16151d',
      '--mx-muted': '#6b7280',
      '--mx-subtle': '#f4f5f7',
      '--mx-surface': '#ffffff',
      '--mx-border': '#e7e8ee',
      '--mx-sidebar': '#15131d',
      '--mx-radius-card': '8px'
    }
  }
];

export const DEFAULT_THEME_ID = 'institutional';
