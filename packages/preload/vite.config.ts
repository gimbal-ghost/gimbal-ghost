import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import pkg from '../../package.json';

export default defineConfig({
    root: __dirname,
    build: {
        outDir: '../../dist/preload',
        emptyOutDir: true,
        lib: {
            entry: 'index.ts',
            formats: ['cjs'],
            fileName: () => '[name].cjs',
        },
        minify: process.env.NODE_ENV === 'production',
        sourcemap: 'inline',
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
});
