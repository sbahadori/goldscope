import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api/gdelt': {
        target: 'https://api.gdeltproject.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/gdelt/, ''),
      },
      '/api/fred': {
        target: 'https://api.stlouisfed.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/fred/, ''),
      },
    },
  },
});
