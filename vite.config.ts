import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL || (process.env.GITHUB_ACTIONS ? '/DIASTRA-Disaster-Intelligence-System/' : '/'),
  plugins: [react()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // FastAPI backend connection
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});