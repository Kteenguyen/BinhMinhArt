import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { ensureSslCertificate } from './server/sslCert.js';

let sslOptions = null;
try {
  const { key, cert } = ensureSslCertificate();
  sslOptions = { key, cert };
} catch {
  const certPath = path.resolve('certs/cert.pem');
  const keyPath = path.resolve('certs/key.pem');
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    sslOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    https: sslOptions,
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
