import path from 'path';
import { readdir } from 'fs/promises';
import { BlackBoxLog } from './BlackBoxLog';
import { FrameResolver } from './FrameResolver';

export interface RenderLogsOptions {
    blackboxPaths: string[]
}

async function getBlackBoxLogObjects(
    blackboxPaths: string[],
    frameResolver: FrameResolver,
): Promise<BlackBoxLog[]> {
    const blackboxLogs = blackboxPaths.map(blackboxPath => new BlackBoxLog({
        logPath: blackboxPath,
        frameResolver,
        outputDirectoryPath: path.dirname(blackboxPath),
    }));

    return blackboxLogs
}

// TODO: Implement error handling
export async function renderLogs({ blackboxPaths } = {} as RenderLogsOptions): Promise<boolean> {
    try {
        // Create a frame resolver with the stick manifest
        const stickManifestFilePath = path.resolve(__dirname, '../../../gg-default-sticks/gg-manifest.json');
        const frameResolver = new FrameResolver({
            stickManifestPath: stickManifestFilePath,
            fps: 30,
        });

        // Create the .csv file of blackbox data
        const blackBoxLogs = await getBlackBoxLogObjects(blackboxPaths, frameResolver);

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
        console.log('Render Logs Complete!');
        return true;
    }
    catch (error) {
        console.log('Render Logs Error:', error);
        return false;
    }
}
