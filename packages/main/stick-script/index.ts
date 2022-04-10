import path from 'path';
import { readdir } from 'fs/promises';
import { BlackBoxLog } from './BlackBoxLog';
import { FrameResolver } from './FrameResolver';

export interface RenderLogsOptions {
    blackBoxDirectories: string[]
}

async function getBlackBoxLogsFromDirectories(
    directories: string[],
    frameResolver: FrameResolver,
): Promise<BlackBoxLog[]> {
    const blackBoxLogsPromies = directories.map(async directory => {
        const blackBoxFileDirectory = path.resolve(directory);

        const blackBoxDirectoryFilenames = await readdir(blackBoxFileDirectory);

        const blackBoxFilenames = blackBoxDirectoryFilenames.filter(filename => filename.endsWith('.bbl'));

        const blackBoxFilePaths = blackBoxFilenames
            .map(filename => path.resolve(blackBoxFileDirectory, filename));

        const blackBoxLogsInDirectory = blackBoxFilePaths.map(blackBoxFilePath => new BlackBoxLog({
            logPath: blackBoxFilePath,
            frameResolver,
            outputDirectoryPath: blackBoxFileDirectory,
        }));
        return blackBoxLogsInDirectory
    });

    const blackBoxLogs = (await Promise.all(blackBoxLogsPromies)).flat();
    return blackBoxLogs;
}

// TODO: Implement error handling
export async function renderLogs({ blackBoxDirectories } = {} as RenderLogsOptions): Promise<boolean> {
    try {
        // Create a frame resolver with the stick manifest
        const stickManifestFilePath = path.resolve(__dirname, '../../../gg-default-sticks/gg-manifest.json');
        const frameResolver = new FrameResolver({
            stickManifestPath: stickManifestFilePath,
            fps: 30,
        });

        // Create the .csv file of blackbox data
        const blackBoxLogs = await getBlackBoxLogsFromDirectories(blackBoxDirectories, frameResolver);

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
