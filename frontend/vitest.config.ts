import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export default defineConfig({
  plugins: [{ name: 'angular-external-resources', enforce: 'pre', transform(code, id) {
    if (!id.endsWith('.component.ts')) return;
    const transformed = code.replace(/templateUrl:\s*['"]([^'"]+)['"]/g, (_, resource) => `template: ${JSON.stringify(readFileSync(resolve(dirname(id), resource), 'utf8'))}`)
      .replace(/styleUrl:\s*['"][^'"]+['"]/g, 'styles: []');
    return { code: transformed, map: null };
  }}],
  test: {
    environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], include: ['src/**/*.spec.ts'],
    pool: 'forks', maxWorkers: 2,
    coverage: { provider: 'istanbul', include: ['src/app/**/*.ts'], exclude: ['src/**/*.spec.ts'],
      reporter: ['text', 'json', 'json-summary', 'html'], thresholds: { functions: 90 } },
  },
});
