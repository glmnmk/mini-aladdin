import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
    }
  },
  optimizeDeps: {
    noDiscovery: true
  },
  build: {
    rollupOptions: {
      external: ['react-is', 'prop-types']
    }
  }
})
