import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // necesario para exponer el servidor fuera del contenedor Docker
    port: 5173,
    proxy: {
      '/minio': {
        target: 'http://minio:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/minio/, ''),
      },
    },
  },
})
