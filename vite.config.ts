import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('@xyflow') || id.includes('d3-')) {
            return 'vendor-xyflow';
          }
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('/zustand/') ||
            id.includes('/idb-keyval/')
          ) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
});
