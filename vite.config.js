import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // Inoltra le chiamate dati al backend
      '/api': 'http://localhost:8080',
      // Inoltra le rotte necessarie per l'autenticazione Microsoft
      '/login': 'http://localhost:8080',
      '/oauth2': 'http://localhost:8080'
    }
  }
})
