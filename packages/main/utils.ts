import { app } from 'electron';
import path from 'path';

// Function to get path to files that are unpacked from asar
// Unpacked asar files are declared in package.json build.asarUnpack
export function getAsarUnpackedPath(asarPath: string): string {
    if (app.isPackaged) {
        return asarPath.replace('app.asar', 'app.asar.unpacked');
    }

    return asarPath;
}

// Function to get the name of an executable for the current platform
export function getExecutableName(executable: string): string {
    const extension = process.platform === 'win32' ? '.exe' : '';
    return executable + extension;
}

// Get the executable name for a tool. For vendored tools, returns the
// absolute path. Otherwise, returns the name of the system executable.
export function getToolName(tool: 'blackbox_decode' | 'ffmpeg'): string {
    if (tool === 'ffmpeg' && process.platform === 'linux') {
        return 'ffmpeg';
    }

    const vendorDir = tool === 'blackbox_decode' ? 'blackbox-tools-0.4.3' : tool;
    const exeName = getExecutableName(tool);
    const absoluteDir = path.resolve(__dirname, './vendor/', vendorDir, exeName);

    return getAsarUnpackedPath(absoluteDir);
}
