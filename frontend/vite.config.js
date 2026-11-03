import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
// Use an explicit IPv4 address: localhost may reach a different IPv6 listener on Windows/WSL.
// Keep 5173 as the default for existing integrations; --port 5174 overrides it.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.LEXI_N8N_URL || 'http://localhost:5678'
  const webhook = env.LEXI_N8N_PATH || '/webhook/orientacion-legal'
  return {
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: {
    '/api/lexi/orientacion': {
      target, changeOrigin: true, timeout: 65000, proxyTimeout: 65000,
      rewrite: () => webhook,
    },
  } },
  }
})
