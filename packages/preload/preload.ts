import { contextBridge, ipcRenderer } from 'electron';
import { RenderLogsOptions } from '../main/renderer';

export type ContextBridgeAPI = {
    getBlackboxFilePaths: () => Promise<string | null>,
    // eslint-disable-next-line no-unused-vars
    render: (renderOptions: RenderLogsOptions) => Promise<Error | boolean>,
    onEvent: (callback: () => void) => void,
}

const api: ContextBridgeAPI = {
    getBlackboxFilePaths: () => ipcRenderer.invoke('getBlackboxFilePaths'),
    render: (renderOptions: RenderLogsOptions) => ipcRenderer.invoke('render', renderOptions),
    onEvent: callback => ipcRenderer.on('event', callback),
};

contextBridge.exposeInMainWorld('electron', api);
