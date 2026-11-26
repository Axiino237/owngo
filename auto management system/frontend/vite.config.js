import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://owngo-crm.169.58.78.11.sslip.io',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
