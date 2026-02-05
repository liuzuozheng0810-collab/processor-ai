import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 这里必须和 vercel dev 的端口一致
        changeOrigin: true,
        secure: false,
      }
    }
  }
});