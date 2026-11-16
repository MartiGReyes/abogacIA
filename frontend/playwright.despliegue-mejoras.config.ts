import {defineConfig,devices} from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'mejoras-interfaz.spec.ts',workers:1,retries:0,timeout:60000,
 reporter:[['list'],['json',{outputFile:'../../.private-despliegue-interfaz-20261115/browser-simulado.json'}]],
 outputDir:'../../.private-despliegue-interfaz-20261115/artifacts-simulados',
 use:{baseURL:'http://127.0.0.1:5173',actionTimeout:10000,reducedMotion:'reduce',screenshot:'only-on-failure'},
 projects:[{name:'escritorio',use:{browserName:'chromium',viewport:{width:1366,height:1000}}},{name:'celular',use:{...devices['iPhone 13'],browserName:'chromium'}}],
})
