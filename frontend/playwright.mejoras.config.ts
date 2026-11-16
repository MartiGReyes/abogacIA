import {defineConfig,devices} from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'mejoras-interfaz.spec.ts',workers:1,retries:0,timeout:60000,
 reporter:[['list'],['json',{outputFile:'../../.private-mejoras-interfaz-20261115/browser.json'}]],
 outputDir:'../../.private-mejoras-interfaz-20261115/artifacts',
 use:{baseURL:'http://127.0.0.1:5204',actionTimeout:10000,screenshot:'only-on-failure',reducedMotion:'reduce'},
 projects:[{name:'escritorio',use:{browserName:'chromium',viewport:{width:1366,height:1000}}},{name:'celular',use:{...devices['iPhone 13'],browserName:'chromium'}}],
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5204',url:'http://127.0.0.1:5204',reuseExistingServer:false,
 env:{VITE_AUTH_URL:'/',VITE_ABOGADOS_URL:'/',VITE_CIUDADANOS_URL:'/',VITE_ADMIN_CIUDADANOS_URL:'/',VITE_ADMIN_ABOGADOS_URL:'/'}},
})
