import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SessionStorageService {
  private readonly document = inject(DOCUMENT);
  get(key: string): string | null {
    try { return this.document.defaultView?.sessionStorage.getItem(key) ?? null; }
    catch { return null; }
  }
  set(key: string, value: string): void {
    this.document.defaultView?.sessionStorage.setItem(key, value);
  }
  remove(key: string): void {
    this.document.defaultView?.sessionStorage.removeItem(key);
  }
}
