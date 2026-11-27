import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server forwards API and SignalR calls to the back end, so the browser never makes a cross-origin request.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5080',
      '/hubs': { target: 'http://localhost:5080', ws: true },
    },
  },
})
