import { ipcMain, dialog } from 'electron';

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

export function registerIPCEvents(): void {
    ipcMain.handle('getDirectory', getDirectory);
}
