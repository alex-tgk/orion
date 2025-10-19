import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3301,
    proxy: {
      '/api': {
        target: 'http://localhost:3300',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3300',
        ws: true,
      },
    },
  },
});
