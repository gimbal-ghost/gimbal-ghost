import { app } from 'electron';
import { release } from 'os';
import { autoUpdater } from 'electron-updater';
import installExtension from 'electron-devtools-installer';
import { registerMainIPCHandlers } from './ipc/ipc';
import pkg from '../../package.json';
import { log } from './logger';
import { createWindow, getWindow } from './window';

// Configure logging
log.info(`${app.name} starting with version: ${pkg.version}, platform: ${process.platform}, electron: ${process.versions.electron}, chrome: ${process.versions.chrome}`);
autoUpdater.logger = log;

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) {
    app.disableHardwareAcceleration();
}

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') {
    app.setAppUserModelId(pkg.build.productName);
}

// Force app to have a single instance
if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

// Ensure render process is sandboxed
app.enableSandbox();

app.whenReady().then(async () => {
    // If in development mode then load devtools
    if (!app.isPackaged) {
        const vueDevToolsChromeStoreId = 'nhdogjmejiglipccpnnnanhbledajbpd';
        installExtension(vueDevToolsChromeStoreId)
        .then(name => console.log(`Added Extension:  ${name}`))
        .catch(err => console.log('An error occurred when adding chrome extension: ', err));
    }
    autoUpdater.checkForUpdatesAndNotify();
    registerMainIPCHandlers();
    await createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('second-instance', () => {
    const window = getWindow();
    if (window) {
        // Focus on the main window if the user tried to open another
        if (window.isMinimized()) {
            window.restore();
        }
        window.focus();
    }
});

app.on('activate', async () => {
    const window = getWindow();
    if (window) {
        window.focus();
    }
    else {
        await createWindow();
    }
});
