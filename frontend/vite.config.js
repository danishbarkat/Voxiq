import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'telnyx':       ['@telnyx/webrtc'],
          'socket':       ['socket.io-client'],
          'leaflet':      ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  server: {
    hmr: true,
    allowedHosts: true,
  },
})
