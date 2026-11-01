import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/images': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/thumbnails': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
