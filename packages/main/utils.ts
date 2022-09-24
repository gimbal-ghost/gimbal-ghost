import { app } from 'electron';
import path from 'path';

export const RESOURCE_PATH: string = path.resolve(app.getAppPath(), '..');

// Get the name of an executable for the current platform
function getExecutableName(executable: string): string {
    const extension = process.platform === 'win32' ? '.exe' : '';
    return executable + extension;
}

// Get the absolute path to a vendored tool
export function getToolName(tool: 'blackbox_decode' | 'ffmpeg'): string {
    return path.resolve(
        RESOURCE_PATH,
        'vendor',
        tool === 'blackbox_decode' ? 'blackbox-tools' : tool,
        getExecutableName(tool),
    );
}
