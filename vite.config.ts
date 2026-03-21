import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveBasePath } from './vite.base';

const cardEntries = Object.fromEntries(
  readdirSync(resolve(__dirname, 'card'))
    .filter((slug) => statSync(resolve(__dirname, 'card', slug)).isDirectory())
    .map((slug) => [`card-${slug}`, resolve(__dirname, 'card', slug, 'index.html')]),
);

export default defineConfig({
  plugins: [react()],
  base: resolveBasePath(),
  build: {
    rollupOptions: {
      input: {
        notFound: resolve(__dirname, '404.html'),
        main: resolve(__dirname, 'index.html'),
        ...cardEntries,
      },
    },
  },
});
