import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: 'dashboard.spec.ts', timeout: 30000, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5181', browserName: 'chromium', locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', trace: 'retain-on-failure' },
  reporter: 'list',
})
