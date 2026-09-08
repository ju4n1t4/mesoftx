export function initialsFromName(name: string, surname = ''): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
}

export function parseNumericList(value: string): number[] {
  return value.split(',').map((item) => Number(item.trim())).filter(Boolean);
}
