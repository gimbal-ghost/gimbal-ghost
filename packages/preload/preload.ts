import { contextBridge, ipcRenderer } from 'electron';
import { RenderLogsOptions } from '../main/stick-script'

export type ContextBridgeAPI = {
    getDirectory: () => Promise<string | null>,
    render: (renderOptions: RenderLogsOptions) => Promise<Error | boolean>,
}

const api: ContextBridgeAPI = {
    getDirectory: () => ipcRenderer.invoke('getDirectory'),
    render: (renderOptions: RenderLogsOptions) => ipcRenderer.invoke('render', renderOptions),
};

contextBridge.exposeInMainWorld('electron', api);
