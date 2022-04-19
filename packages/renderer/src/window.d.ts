import type { ContextBridgeAPI } from 'packages/preload/preload';

declare global {
    // eslint-disable-next-line no-unused-vars
    interface Window {
        electron: ContextBridgeAPI
    }
}
