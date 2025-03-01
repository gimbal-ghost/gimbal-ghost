import {
    app, BrowserWindow, shell, BrowserWindowConstructorOptions, screen,
} from 'electron';
import { join } from 'path';
import { Settings } from './settings';
import pkg from '../../package.json';
import { EventBus } from './event-bus/EventBus';
import { EventNames } from './event-bus/types';

export const WINDOW_WIDTH = 800;
export const WINDOW_HEIGHT = 600;

export function getWindow(): BrowserWindow | null {
    const allWindows = BrowserWindow.getAllWindows();

    if (allWindows.length) {
        return allWindows[allWindows.length - 1];
    }
    return null;
}

function windowIsOnScreen(windowX: number, windowY: number): Boolean {
    let isOnScreen = false;
    screen.getAllDisplays().forEach(display => {
        // Determine if display is rotated 90 degrees such that width/height are swapped
        const displayRotated90 = display.rotation % 180 !== 0;

        // Determine the bounds of the display
        const xMin = display.workArea.x;
        const yMin = display.workArea.y;
        const xMax = xMin + (displayRotated90 ? display.workArea.height : display.workArea.width);
        const yMax = yMin + (displayRotated90 ? display.workArea.width : display.workArea.height);

        // Determine if the window is on the display
        if (windowX >= xMin && windowX <= xMax && windowY >= yMin && windowY <= yMax) {
            isOnScreen = true;
        }
    });
    return isOnScreen;
}

export async function createWindow(): Promise<BrowserWindow> {
    const windowOptions: BrowserWindowConstructorOptions = {
        webPreferences: {
            preload: join(__dirname, '../preload/preload.cjs'),
        },
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        autoHideMenuBar: true,
        resizable: false,
        maximizable: false,
    };

    // If this is frist load or window is not on a display then center it
    if (Settings.get('firstLoad') || !windowIsOnScreen(Settings.get('windowPosition').x, Settings.get('windowPosition').y)) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const windowX = Math.round((primaryDisplay.workArea.width - WINDOW_WIDTH) / 2);
        const windowY = Math.round((primaryDisplay.workArea.height - WINDOW_HEIGHT) / 2);
        windowOptions.x = windowX;
        windowOptions.y = windowY;
        Settings.set('windowPosition', { x: windowX, y: windowY });
    }
    // Otherwise use last known position
    else {
        windowOptions.x = Settings.get('windowPosition').x;
        windowOptions.y = Settings.get('windowPosition').y;
    }

    if (Settings.get('firstLoad')) {
        Settings.set('firstLoad', false);
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

    window.on('ready-to-show', () => {
        // Send the loaded settings down to the renderer
        window.webContents.send('settingsLoaded', Settings.store);
    });

    EventBus.on(EventNames.Every, payload => {
        window.webContents.send('event', payload);
    });

    return window;
}
