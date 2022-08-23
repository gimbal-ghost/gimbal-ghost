import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import copy from 'rollup-plugin-copy';
import pkg from '../../package.json';

export default defineConfig({
    root: __dirname,
    build: {
        outDir: '../../dist/main',
        emptyOutDir: false,
        lib: {
            entry: 'main.ts',
            formats: ['cjs'],
            fileName: () => '[name].cjs',
        },
        minify: process.env.NODE_ENV === 'production',
        sourcemap: true,
        rollupOptions: {
            // Explicitly list out the external modules
            external: [
                'electron',
                // Node modules
                ...builtinModules,
                // Project modules
                ...Object.keys(pkg.dependencies || {}),
            ],
        },
    },
    plugins: [
        copy({
            targets: [
                { src: `packages/main/vendor/${process.platform}`, dest: 'dist/main', rename: 'vendor' },
                { src: 'packages/main/default-gimbals', dest: 'dist/main' },
            ],
            copyOnce: true,
            hook: 'writeBundle',
        }),
    ],
});
