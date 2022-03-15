import { app, BrowserWindow, shell } from 'electron';
import { release } from 'os';
import { join } from 'path';

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) {
    app.disableHardwareAcceleration();
}

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') {
    app.setAppUserModelId(app.getName());
}

// Force app to have a single instance
if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

let browserWindow: BrowserWindow | null = null;

async function createWindow() {
    browserWindow = new BrowserWindow({
        title: 'Main window',
        webPreferences: {
            preload: join(__dirname, '../preload/index.cjs'),
        },
    });

    // If we are in production then grab index locally
    if (app.isPackaged || process.env.DEBUG) {
        browserWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
    // Otherwise use the dev server
    else {
        // Reassign in development to avoid vite static replacement
        // See: https://vitejs.dev/guide/env-and-mode.html#production-replacement
        const { env } = process;
        const url = `http://${env.VITE_DEV_SERVER_HOST}:${env.VITE_DEV_SERVER_PORT}`;
        browserWindow.loadURL(url);
        browserWindow.webContents.openDevTools();
    }

    // Test active push message to Renderer-process
    browserWindow.webContents.on('did-finish-load', () => {
        browserWindow?.webContents.send('main-process-message', (new Date()).toLocaleString());
    });

    // Make all links open with the browser, not with the application
    browserWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
}

// Ensure render process is sandboxed
app.enableSandbox();

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    browserWindow = null;
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('second-instance', () => {
    if (browserWindow) {
        // Focus on the main window if the user tried to open another
        if (browserWindow.isMinimized()) {
            browserWindow.restore();
        }
        browserWindow.focus();
    }
});

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length) {
        allWindows[0].focus();
    }
    else {
        createWindow();
    }
});
