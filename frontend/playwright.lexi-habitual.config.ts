import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./e2e',testMatch:'lexi-habitual-contrato.spec.ts',workers:1,timeout:60000,
 use:{baseURL:'http://127.0.0.1:5202',browserName:'chromium',actionTimeout:12000,screenshot:'only-on-failure'},
 webServer:{command:'npm run dev -- --port 5202',url:'http://127.0.0.1:5202',reuseExistingServer:false},
})
