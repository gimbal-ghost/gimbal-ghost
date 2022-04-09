import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import pkg from '../../package.json';

export default defineConfig({
    root: __dirname,
    build: {
        outDir: '../../dist/main',
        emptyOutDir: true,
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
});
