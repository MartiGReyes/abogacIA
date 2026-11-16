import { defineConfig, devices } from '@playwright/test'
const env = { VITE_AUTH_URL:'/', VITE_ABOGADOS_URL:'/', VITE_CIUDADANOS_URL:'/', VITE_ADMIN_CIUDADANOS_URL:'/', VITE_ADMIN_ABOGADOS_URL:'/' }
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 60000,
  reporter: [['list'], ['json', { outputFile: '../integracion/total/browser.json' }]],
  outputDir: '../integracion/total/artifacts',
  use: { actionTimeout: 10000, reducedMotion: 'reduce', screenshot: 'only-on-failure' },
  projects: [
    {name:'principal-escritorio',testMatch:'mejoras-interfaz.spec.ts',grepInvert:/Administración/,use:{baseURL:'http://127.0.0.1:5204',viewport:{width:1366,height:1000}}},
    {name:'principal-celular',testMatch:'mejoras-interfaz.spec.ts',grepInvert:/Administración/,use:{...devices['iPhone 13'],browserName:'chromium',baseURL:'http://127.0.0.1:5204'}},
    {name:'admin',testMatch:'admin-independiente.spec.ts',use:{baseURL:'http://127.0.0.1:5205'}},
  ],
  webServer: [
    {command:'npm run dev -- --port 5204',url:'http://127.0.0.1:5204',env,reuseExistingServer:false},
    {command:'npm run dev -- --mode admin --port 5205',url:'http://127.0.0.1:5205',env,reuseExistingServer:false},
  ],
})
