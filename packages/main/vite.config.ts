import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import pkg from '../../package.json';

export default defineConfig({
    root: __dirname,
    build: {
        outDir: '../../dist/main',
        emptyOutDir: true,
        lib: {
            entry: 'index.ts',
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
        viteStaticCopy({
            targets: [
                { src: 'vendor/**/*', dest: '../../dist/main/vendor' },
            ],
            flatten: false,
        }),
    ],
});
