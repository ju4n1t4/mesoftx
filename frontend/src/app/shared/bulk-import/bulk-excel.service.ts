import { Injectable } from '@angular/core';
import { readSheet } from 'read-excel-file/browser';
import writeExcelFile from 'write-excel-file/browser';

// Límites defensivos para archivos subidos por el usuario (evita agotar memoria).
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

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
  async downloadTemplate(fileName: string, headers: string[], sheetName = 'Plantilla'): Promise<void> {
    const name = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    await writeExcelFile([headers], { sheet: sheetName }).toFile(name);
  }

  async readRows(file: File): Promise<Record<string, unknown>[]> {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('El archivo supera el tamaño máximo permitido (5 MB).');
    }
    const data = await readSheet(file);
    if (!data || data.length < 2) return [];
    if (data.length - 1 > MAX_ROWS) {
      throw new Error(`El archivo supera el máximo de ${MAX_ROWS} filas.`);
    }
    const headers = (data[0] as unknown[]).map(h => String(h ?? '').trim());
    return data.slice(1).map(cells => {
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (h) row[h] = this.cellToString((cells as unknown[])[i]);
      });
      return row;
    });
  }

  private cellToString(cell: unknown): string {
    if (cell === null || cell === undefined) return '';
    if (cell instanceof Date) return cell.toISOString().slice(0, 10);
    return String(cell);
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
