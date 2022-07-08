import path from 'path';
import { BlackboxLog } from './BlackBoxLog';
import { FrameResolver } from './FrameResolver';
import { log } from '../logger';
import { getAsarUnpackedPath } from '../utils';
import { GimbalRenderSettings } from '../settings/schema';

export interface RenderLogsOptions {
    blackboxLogPaths: string[],
    gimbalRenderSettings: GimbalRenderSettings,
}

async function getBlackboxLogObjects(
    blackboxPaths: string[],
    frameResolver: FrameResolver,
): Promise<BlackboxLog[]> {
    const blackboxLogs = blackboxPaths.map(blackboxPath => new BlackboxLog({
        logPath: blackboxPath,
        frameResolver,
        outputDirectoryPath: path.dirname(blackboxPath),
    }));

    return blackboxLogs;
}

// TODO: Implement error handling
export async function renderLogs({ blackboxLogPaths, gimbalRenderSettings } = {} as RenderLogsOptions): Promise<boolean> {
    try {
        // Create a frame resolver with the stick manifest
        // Default sticks are unpacked from asar
        const stickManifestFilePath = getAsarUnpackedPath(path.resolve(__dirname, './default-gimbals/gg-manifest.json'));
        const frameResolver = new FrameResolver({
            stickManifestPath: stickManifestFilePath,
            transmitterMode: gimbalRenderSettings.mode,
            fps: gimbalRenderSettings.outputFps,
        });

        // Create the .csv file of blackbox data
        const blackBoxLogs = await getBlackboxLogObjects(blackboxLogPaths, frameResolver);

        // Decode all of the blackbox logs
        const decodePromises = blackBoxLogs.map(blackBoxLog => blackBoxLog.decode());
        await Promise.all(decodePromises);

        // Parse all the blackbox logs into demux files for rendering
        const parsePromises = blackBoxLogs.map(blackBoxLog => blackBoxLog.parse());
        await Promise.all(parsePromises);

        // Render all the logs
        const renderPromises = blackBoxLogs.map(blackBoxLog => blackBoxLog.render());
        await Promise.all(renderPromises);

        // Dispose of all the temporary files
        const disposePromises = blackBoxLogs.map(blackBoxLog => blackBoxLog.dispose());
        await Promise.all(disposePromises);
        log.info('Render Logs Complete!');
        return true;
    }
    catch (error) {
        log.error('Render Logs Error:', error);
        return false;
    }
}
