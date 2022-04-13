import { contextBridge, ipcRenderer } from 'electron';
import { RenderLogsOptions } from '../main/renderer'

export type ContextBridgeAPI = {
    getBlackboxFilePaths: () => Promise<string | null>,
    render: (renderOptions: RenderLogsOptions) => Promise<Error | boolean>,
}

const api: ContextBridgeAPI = {
    getBlackboxFilePaths: () => ipcRenderer.invoke('getBlackboxFilePaths'),
    render: (renderOptions: RenderLogsOptions) => ipcRenderer.invoke('render', renderOptions),
};

contextBridge.exposeInMainWorld('electron', api);
