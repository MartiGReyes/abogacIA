import { defineConfig } from '@playwright/test'
import config from './playwright.operativa.config'
export default defineConfig({ ...config, testMatch: 'lexi-live.spec.ts', timeout: 90000 })
