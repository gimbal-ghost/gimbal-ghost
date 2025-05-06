import { app } from 'electron';
import path from 'path';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { log } from './logger';

export const RESOURCE_PATH: string = path.resolve(app.getAppPath(), '..');

// Get the name of an executable for the current platform
function getExecutableName(executable: string): string {
    const extension = process.platform === 'win32' ? '.exe' : '';
    return executable + extension;
}

// Get the absolute path to a vendored tool
export function getVendorToolPath(tool: 'blackbox_decode' | 'ffmpeg'): string {
  if (tool === 'blackbox_decode') {
    return path.resolve(
        RESOURCE_PATH,
        'vendor',
        tool === 'blackbox_decode' ? 'blackbox-tools' : tool,
        getExecutableName(tool),
    );
  }

  if (tool === 'ffmpeg') {
    // ffmpeg is installed via @ffmpeg-installer/ffmpeg--not from the vendor directory
    const ffmpegAsarReplacedPath = ffmpeg.path.replace('app.asar', 'app.asar.unpacked');
    
    log.info(`Using ffmpeg version: ${ffmpeg.version}, path: ${ffmpegAsarReplacedPath}`);
    
    return ffmpegAsarReplacedPath;
  }

  throw new Error(`Unknown tool: ${tool}`);
}
