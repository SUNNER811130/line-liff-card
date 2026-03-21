import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveBasePath } from './vite.base';

export default defineConfig({
  plugins: [react()],
  base: resolveBasePath(),
  build: {
    rollupOptions: {
      input: {
        notFound: resolve(__dirname, '404.html'),
        main: resolve(__dirname, 'index.html'),
        cardDefault: resolve(__dirname, 'card/default/index.html'),
      },
    },
  },
});
