import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'restauracion-integracion.spec.ts',workers:1,timeout:120000,retries:0,
 reporter:[['list'],['json',{outputFile:'../integracion/despliegue-integracion-20261115/browser-restaurado.json'}]],
 outputDir:'../integracion/despliegue-integracion-20261115/browser-artifacts',
 use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1366,height:1000},reducedMotion:'reduce',trace:'off'},
})
