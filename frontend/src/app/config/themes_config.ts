export interface MesoftxTheme {
  name: string;
  colors: Record<string, string>;
}

export const MESOFTX_THEME: MesoftxTheme = {
  name: 'mesoftx-default',
  colors: {
    primary: '#ffa502',
    primaryDark: '#d88900',
    ink: '#16151d',
    inkSoft: '#2a2935',
    surface: '#ffffff',
    surfaceAlt: '#f7f8fb',
    border: '#e4e7ec',
    muted: '#7a7f8c',
    success: '#16a34a',
    warning: '#ea580c',
    danger: '#dc2626',
    info: '#2563eb',
    purple: '#7c3aed'
  }
};
