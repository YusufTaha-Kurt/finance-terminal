import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import borsaApiPlugin from './server/api-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    borsaApiPlugin(),
  ],
  server: {
    proxy: {
      // /api/yahoo isteklerini Yahoo Finance'e yönlendir (CORS bypass)
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        secure: false,
      },
    },
  },
})
