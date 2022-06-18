import {
    app, BrowserWindow, shell, BrowserWindowConstructorOptions,
} from 'electron';
import { join } from 'path';
import { Settings } from './settings';
import pkg from '../../package.json';
import { EventBus } from './event-bus/EventBus';
import { EventNames } from './event-bus/types';

export function getWindow(): BrowserWindow | null {
    const allWindows = BrowserWindow.getAllWindows();

    if (allWindows.length) {
        return allWindows[allWindows.length - 1];
    }
    return null;
}

export async function createWindow(): Promise<BrowserWindow> {
    const windowOptions: BrowserWindowConstructorOptions = {
        webPreferences: {
            preload: join(__dirname, '../preload/preload.cjs'),
        },
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        resizable: false,
        maximizable: false,
    };

    if (Settings.get('firstLoad')) {
        Settings.set('firstLoad', false);
    }
    else {
        windowOptions.x = Settings.get('windowPosition').x;
        windowOptions.y = Settings.get('windowPosition').y;
    }

    const window = new BrowserWindow(windowOptions);
    // No menu is needed
    window.removeMenu();

    // Save the last position of the window
    window.on('moved', () => {
        const windowBounds = window?.getBounds();
        if (windowBounds) {
            Settings.set('windowPosition', { x: windowBounds.x, y: windowBounds.y });
        }
    });

    // If we are in production then grab index locally
    if (app.isPackaged) {
        window.loadFile(join(__dirname, '../renderer/index.html'), { query: { version: pkg.version } });
    }
    // Otherwise use the dev server
    else {
        // Vite Environment variables set in watch script
        // Avoid process.env.<var> syntax which vite statically replaces
        // See: https://vitejs.dev/guide/env-and-mode.html#production-replacement
        // eslint-disable-next-line dot-notation
        const host = process.env['VITE_DEV_SERVER_HOST'];
        // eslint-disable-next-line dot-notation
        const port = process.env['VITE_DEV_SERVER_PORT'];
        const versionQueryString = `version=${pkg.version}`;
        const url = `http://${host}:${port}?${versionQueryString}`;
        window.loadURL(url);
        window.webContents.openDevTools({ mode: 'detach', activate: false });
    }

    // Make all links open with the browser, not with the application
    window.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    EventBus.on(EventNames.Every, payload => {
        window.webContents.send('event', payload);
    });

    return window;
}
