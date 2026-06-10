import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // SECURITY FIX L4: Rimuove i log di console in produzione per prevenire perdite di dati (email, stack trace)
  esbuild: {
    pure: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.error']
  },
  // Ho rimosso la sezione server.headers che bloccava le popup di login
  server: {
    port: 5173,
    host: true, // consente l'accesso da rete locale (es. smartphone)
    allowedHosts: true, // consente l'accesso da tunnel pubblici come LocalTunnel o Ngrok
    proxy: {
      '/mga-assembly-manager': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/mga-assembly-manager': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})