import { contextBridge, ipcRenderer } from 'electron';
import { RenderLogsOptions } from '../main/renderer';

export type ContextBridgeAPI = {
    getBlackboxFilePaths: () => Promise<string | null>,
    // eslint-disable-next-line no-unused-vars
    render: (renderOptions: RenderLogsOptions) => Promise<Error | boolean>,
    openDirectory: (logPath: string) => void,
    openChangelog: () => void,
    onEvent: (callback: () => void) => void,
}

const api: ContextBridgeAPI = {
    getBlackboxFilePaths: () => ipcRenderer.invoke('getBlackboxFilePaths'),
    render: (renderOptions: RenderLogsOptions) => ipcRenderer.invoke('render', renderOptions),
    openDirectory: (logPath: string) => ipcRenderer.invoke('openDirectory', logPath),
    openChangelog: () => ipcRenderer.invoke('openChangelog'),
    onEvent: callback => ipcRenderer.on('event', callback),
};

contextBridge.exposeInMainWorld('electron', api);
