import { contextBridge, ipcRenderer } from 'electron';

export type ContextBridgeAPI = {
    getDirectory: () => Promise<string | null>,
}

const api: ContextBridgeAPI = {
    getDirectory: () => ipcRenderer.invoke('getDirectory'),
};

contextBridge.exposeInMainWorld('electron', api);
