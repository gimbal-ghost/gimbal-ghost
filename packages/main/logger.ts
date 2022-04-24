import { app, dialog, shell } from 'electron';
import electronLog from 'electron-log';
import pkg from '../../package.json';

const appLog = electronLog;
// Production configuration
if (app.isPackaged) {
    appLog.transports.file.level = 'debug';
}
// Development configuration
else {
    appLog.transports.file.level = 'debug';
}

appLog.catchErrors({
    showDialog: false,
    onError(error) {
        dialog.showMessageBox({
            title: 'Error',
            message: 'An error was encountered that wasn\'t handled properly.',
            detail: 'If you want to help fix it please report it below.',
            type: 'error',
            buttons: ['Ignore', 'Report', 'Exit'],
        }).then(result => {
            if (result.response === 1) {
                const title = `Error Report (v${pkg.version})`;
                const body = `Please describe what you were doing when this error occurred:%0A%0A%0A%0APlease do not modify below this line 😉%0A%0A---%0AMessage: ${error.message}%0AStack: ${error.stack}`;
                // Open a new issue on GitHub with the stack trace
                shell.openExternal(`${pkg.bugs.url}/new?title=${title}&body=${body}`);
                return;
            }

            if (result.response === 2) {
                app.quit();
            }
        });
    },
});

export const log = appLog;
