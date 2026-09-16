import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export interface BulkImportItem {
  row: number;
  label: string;
  detail?: string;
}

export interface BulkImportSummary {
  success: BulkImportItem[];
  skipped: BulkImportItem[];
  errors: BulkImportItem[];
}

@Injectable({ providedIn: 'root' })
export class BulkExcelService {
  downloadTemplate(fileName: string, headers: string[], sheetName = 'Plantilla'): void {
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
  }

  async readRows(file: File): Promise<Record<string, unknown>[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  }

  value(row: Record<string, unknown>, key: string): string {
    return String(row[key] ?? '').trim();
  }

  boolValue(row: Record<string, unknown>, key: string, defaultValue = true): boolean {
    const raw = this.value(row, key).toLowerCase();
    if (!raw) return defaultValue;
    return ['si', 'sí', 's', 'true', '1', 'activo', 'activa', 'yes'].includes(raw);
  }
}
