import { ipcMain, dialog } from 'electron';
import { renderLogs, RenderLogsOptions } from '../stick-script';

async function getDirectory(): Promise<string | null> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select directory dontaining blackbox files',
        buttonLabel: 'Select',
        properties: ['openDirectory'],
    });
    if (!canceled) {
        return filePaths[0];
    }
    return null;
}

async function render(event: any, options: RenderLogsOptions): Promise<boolean> {
    return await renderLogs(options);
}

export function registerIPCEvents(): void {
    ipcMain.handle('getDirectory', getDirectory);
    ipcMain.handle('render', render);
}
