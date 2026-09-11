import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    /**
     * In development the client calls "/api/..." and Vite forwards it to the
     * Express server. That means no CORS preflight locally, and the same
     * relative paths work in production once VITE_API_BASE_URL points at the
     * deployed API.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
