import { ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { renderLogs, RenderLogsOptions } from '../renderer';
import pkg from '../../../package.json';

async function getBlackboxFilePaths(): Promise<string[] | null> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Blackbox Files',
        buttonLabel: 'Select',
        filters: [
            { name: 'Blackbox Files', extensions: ['bbl'] },
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

export function registerMainIPCHandlers(): void {
    ipcMain.handle('getBlackboxFilePaths', getBlackboxFilePaths);
    ipcMain.handle('render', render);
    ipcMain.handle('openDirectory', openDirectory);
    ipcMain.handle('openChangelog', openChangelog);
}
