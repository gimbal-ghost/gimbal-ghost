import type { ContextBridgeAPI } from 'packages/preload/preload';

declare global {
    interface Window {
        electron: ContextBridgeAPI
    }
}
