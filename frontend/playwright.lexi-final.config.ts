import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'lexi-final-real.spec.ts',workers:1,retries:0,timeout:480000,
 reporter:[['list'],['json',{outputFile:'../../.private-lexi-final-20261115/browser.json'}]],
 outputDir:'../../.private-lexi-final-20261115/browser-artifacts',
 use:{baseURL:'http://127.0.0.1:5173',browserName:'chromium',headless:true,actionTimeout:12000,viewport:{width:1280,height:850},screenshot:'only-on-failure'},
})
