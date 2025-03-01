import { ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { renderLogs, RenderLogsOptions } from '../renderer';
import pkg from '../../../package.json';
import { GimbalRenderSettings } from '../settings/schema';
import { Settings } from '../settings';
import { log } from '../logger';
import { AllowedLogExtensions } from '../renderer/types';

async function getBlackboxFilePaths(): Promise<string[] | null> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Blackbox Files',
        buttonLabel: 'Select',
        filters: [
            { name: 'Blackbox Files', extensions: [AllowedLogExtensions.BBL, AllowedLogExtensions.BFL, AllowedLogExtensions.CSV] },
        ],
        properties: ['openFile', 'multiSelections', 'dontAddToRecent'],
    });
    if (!canceled) {
        return filePaths;
    }
    return null;
}

async function render(event: any, options: RenderLogsOptions): Promise<boolean> {
    return renderLogs(options);
}

function openDirectory(event: any, logPath: string) {
    const parsedLogPath = path.parse(logPath);
    shell.openPath(parsedLogPath.dir);
}

function openChangelog() {
    const changelogUrl = pkg.bugs.url.replace('issues', 'releases');
    shell.openExternal(changelogUrl);
}

function openReadme(event: any, anchorTag: string | null) {
    if (anchorTag) {
        const readmeUrl = pkg.homepage.replace('#readme', anchorTag);
        shell.openExternal(readmeUrl);
    }
    else {
        shell.openExternal(pkg.homepage);
    }
}

function updateGimbalRenderSettings(event: any, gimbalRenderSettings: GimbalRenderSettings): void {
    log.info(`Render settings updated: ${JSON.stringify(gimbalRenderSettings)}`);
    Settings.set('gimbalRenderSettings', gimbalRenderSettings);
}

export function registerMainIPCHandlers(): void {
    ipcMain.handle('getBlackboxFilePaths', getBlackboxFilePaths);
    ipcMain.handle('render', render);
    ipcMain.handle('openDirectory', openDirectory);
    ipcMain.handle('openChangelog', openChangelog);
    ipcMain.handle('openReadme', openReadme);
    ipcMain.handle('updateGimbalRenderSettings', updateGimbalRenderSettings);
}
