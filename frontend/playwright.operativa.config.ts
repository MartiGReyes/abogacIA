import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: 'operativa.spec.ts', timeout: 30000, fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5182', browserName: 'chromium', locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', trace: 'off', video: 'off' },
  reporter: 'list',
})
