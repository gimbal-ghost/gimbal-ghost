import { contextBridge, ipcRenderer } from 'electron';
import { GimbalRenderSettings } from '../main/settings/schema';
import { RenderLogsOptions } from '../main/renderer';

export type ContextBridgeAPI = {
    // Renderer to main process
    getBlackboxFilePaths: () => Promise<string | null>,
    // eslint-disable-next-line no-unused-vars
    render: (renderOptions: RenderLogsOptions) => Promise<Error | boolean>,
    openDirectory: (logPath: string) => void,
    openChangelog: () => void,
    updateGimbalRenderSettings: (gimbalRenderSettings: GimbalRenderSettings) => void,
    // Main to renderer process
    onEvent: (callback: () => void) => void,
    onSettingsLoaded: (callback: () => void) => void,
}

const api: ContextBridgeAPI = {
    // Renderer to main process
    getBlackboxFilePaths: () => ipcRenderer.invoke('getBlackboxFilePaths'),
    render: (renderOptions: RenderLogsOptions) => ipcRenderer.invoke('render', renderOptions),
    openDirectory: (logPath: string) => ipcRenderer.invoke('openDirectory', logPath),
    openChangelog: () => ipcRenderer.invoke('openChangelog'),
    updateGimbalRenderSettings: (gimbalRenderSettings: GimbalRenderSettings) => ipcRenderer.invoke('updateGimbalRenderSettings', gimbalRenderSettings),
    // Main to renderer process
    onEvent: callback => ipcRenderer.on('event', callback),
    onSettingsLoaded: callback => ipcRenderer.on('settingsLoaded', callback),
};

contextBridge.exposeInMainWorld('electron', api);
