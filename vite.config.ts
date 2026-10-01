import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const olProxy = { target: 'https://openlibrary.org', changeOrigin: true, rewrite: (p: string) => p.replace(/^\/ol/, '') };

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  server: { proxy: { '/ol': olProxy } },
  preview: { proxy: { '/ol': olProxy } },
});
