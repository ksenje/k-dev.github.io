import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base keeps assets working under a project Pages path such as /<repo>/.
// The VITE_CATALOG_URL proxy is only useful for local testing against the old API.
const catalogTarget = process.env.API_TARGET ?? 'http://127.0.0.1:4000'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/tracks': { target: catalogTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})