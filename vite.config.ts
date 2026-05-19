import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// finance.cbtgrinder.com — Vite dev runs on :5176 so it doesn't collide
// with main (:5173), enterprise (:5174), and admin (:5175).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    strictPort: false,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
