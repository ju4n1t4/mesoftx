import 'zone.js';
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { afterEach, vi } from 'vitest';
window.scrollTo = vi.fn();
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
afterEach(() => { TestBed.resetTestingModule(); sessionStorage.clear(); localStorage.clear(); });
