import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api/stooq': {
        target: 'https://stooq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/stooq/, ''),
      },
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
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
      '/api/ai/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai\/deepseek/, ''),
      },
      '/api/ai/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai\/groq/, ''),
      },
      '/api/ai/together': {
        target: 'https://api.together.xyz',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai\/together/, ''),
      },
      '/api/ai/openrouter': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai\/openrouter/, ''),
      },
      '/api/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        secure: false,
        timeout: 300000,
        proxyTimeout: 300000,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
    },
  },
});
