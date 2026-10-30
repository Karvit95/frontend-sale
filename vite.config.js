import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:8080 ws://localhost:5173 https://login.microsoftonline.com https://*.microsoftonline.com; frame-src 'self' https://login.microsoftonline.com https://*.microsoftonline.com; img-src 'self' data: https://*.microsoft.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self' https://login.microsoftonline.com; frame-ancestors 'none';"
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    headers: securityHeaders,
    proxy: {
      '/api': 'http://localhost:8080',
      '/login': 'http://localhost:8080',
      '/oauth2': 'http://localhost:8080'
    }
  },
  preview: {
    headers: securityHeaders
  }
})
