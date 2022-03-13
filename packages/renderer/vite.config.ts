import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    mode: process.env.NODE_ENV,
    root: __dirname,
    plugins: [
        vue(),
    ],
    base: './',
    build: {
        sourcemap: true,
        outDir: '../../dist/renderer',
        emptyOutDir: true,
    },
    server: {
        port: 3344,
    },
});
