var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveBasePath } from './vite.base';
var cardEntries = Object.fromEntries(readdirSync(resolve(__dirname, 'card'))
    .filter(function (slug) { return statSync(resolve(__dirname, 'card', slug)).isDirectory(); })
    .map(function (slug) { return ["card-".concat(slug), resolve(__dirname, 'card', slug, 'index.html')]; }));
export default defineConfig({
    plugins: [react()],
    base: resolveBasePath(),
    build: {
        rollupOptions: {
            input: __assign({ notFound: resolve(__dirname, '404.html'), main: resolve(__dirname, 'index.html') }, cardEntries),
        },
    },
});
