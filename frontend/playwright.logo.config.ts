import {defineConfig,devices} from '@playwright/test'
const published=process.env.LOGO_PUBLISHED==='true'
export default defineConfig({testDir:'./e2e',testMatch:'logo-oficial.spec.ts',workers:1,timeout:30000,
 reporter:[['list'],['json',{outputFile:`../integracion/logo-20261115/${published?'publicado':'preview'}.json`}]],
 outputDir:'../integracion/logo-20261115/artifacts',use:{baseURL:published?'http://127.0.0.1:5173':'http://127.0.0.1:5293',reducedMotion:'reduce'},
 projects:[{name:'escritorio',use:{viewport:{width:1366,height:900}}},{name:'celular',use:{...devices['iPhone 13'],browserName:'chromium'}}],
 webServer:published?undefined:{command:'npm run preview -- --host 127.0.0.1 --port 5293',url:'http://127.0.0.1:5293',reuseExistingServer:false},
})
