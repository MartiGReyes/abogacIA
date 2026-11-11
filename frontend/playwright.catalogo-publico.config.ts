import { defineConfig } from '@playwright/test'
import config from './playwright.operativa.config'
export default defineConfig({ ...config, testMatch: 'catalogo-publico.spec.ts', timeout: 60000 })
