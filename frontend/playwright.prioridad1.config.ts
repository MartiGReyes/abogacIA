import {defineConfig,devices} from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'prioridad1-nativa.spec.ts',workers:1,timeout:60000,retries:0,
 reporter:[['list'],['json',{outputFile:'../integracion/prioridad1/browser.json'}]],outputDir:'../integracion/prioridad1/browser-artifacts',
 use:{baseURL:'http://127.0.0.1:5283',reducedMotion:'reduce',screenshot:'only-on-failure',trace:'off'},
 projects:[{name:'escritorio',use:{viewport:{width:1366,height:1000}}},{name:'celular',use:{...devices['iPhone 13'],browserName:'chromium'}}],
 webServer:{command:'npm run dev -- --port 5283',url:'http://127.0.0.1:5283',reuseExistingServer:false,env:{VITE_AUTH_URL:'/',VITE_ABOGADOS_URL:'/',VITE_CIUDADANOS_URL:'/',ABOGACIA_DEV_API_URL:'http://127.0.0.1:5383'}},
})
