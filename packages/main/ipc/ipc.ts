import { ipcMain, dialog } from 'electron';
import { renderLogs, RenderLogsOptions } from '../renderer';

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

export function registerMainIPCHandlers(): void {
    ipcMain.handle('getBlackboxFilePaths', getBlackboxFilePaths);
    ipcMain.handle('render', render);
}
