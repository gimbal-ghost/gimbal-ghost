import { spawn } from 'child_process';
import { createServer, build } from 'vite';
import electron from 'electron';

/**
 * @type {(server: import('vite').ViteDevServer) => Promise<import('rollup').RollupWatcher>}
 */
function watchMain(server) {
    /**
     * @type {import('child_process').ChildProcessWithoutNullStreams | null}
     */
    let electronProcess = null;
    const address = server.httpServer.address();
    console.log('address', address);
    // Merge our dev server environment variables to expose to electron process
    const env = {
        ...process.env,
        VITE_DEV_SERVER_HOST: address.address,
        VITE_DEV_SERVER_PORT: address.port,
    };

    return build({
        configFile: 'packages/main/vite.config.ts',
        mode: 'development',
        plugins: [{
            name: 'electron-main-watcher',
            writeBundle() {
                electronProcess?.kill();
                // Expose the merged environment variables to our development process
                electronProcess = spawn(electron, ['.'], { stdio: 'inherit', env });
            },
        }],
        build: {
            watch: true,
        },
    });
}

/**
 * @type {(server: import('vite').ViteDevServer) => Promise<import('rollup').RollupWatcher>}
 */
function watchPreload(server) {
    return build({
        configFile: 'packages/preload/vite.config.ts',
        mode: 'development',
        plugins: [{
            name: 'electron-preload-watcher',
            writeBundle() {
                server.ws.send({ type: 'full-reload' });
            },
        }],
        build: {
            watch: true,
        },
    });
}

const server = await createServer({ configFile: 'packages/renderer/vite.config.ts' });

await server.listen();
await watchPreload(server);
await watchMain(server);
