import { defineConfig, devices } from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'total-desplegado.spec.ts',workers:1,timeout:30000,
  reporter:[['list'],['json',{outputFile:'../integracion/total/desplegado.json'}]],outputDir:'../integracion/total/desplegado-artifacts',
  projects:[{name:'escritorio',use:{viewport:{width:1366,height:900}}},{name:'celular',use:{...devices['iPhone 13'],browserName:'chromium'}}],
  use:{baseURL:'http://127.0.0.1:5173',reducedMotion:'reduce'},
})
