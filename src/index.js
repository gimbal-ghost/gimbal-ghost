import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    readdirSync, unlinkSync, createReadStream, createWriteStream,
} from 'fs';
import { parse as csvParse } from 'csv-parse';
import { transform } from 'stream-transform';
import { nextTick } from 'process';

(async () => {
    const scriptName = fileURLToPath(import.meta.url);
    const scriptDirectory = path.dirname(scriptName);
    const projectRootPath = path.resolve(scriptDirectory, '..');

    const blackBoxDecodeExePath = path.resolve(projectRootPath, 'vendor/blackbox-tools-0.4.3-windows');
    const blackBoxFileDirectory = path.resolve(projectRootPath, 'blackbox-logs');
    const blackboxFile = path.resolve(projectRootPath, blackBoxFileDirectory, 'btfl_001.bbl');
    const blackboxDecodeArgs = [blackboxFile];

    // Create the .csv file of blackbox data
    spawnSync('blackbox_decode.exe', blackboxDecodeArgs, { cwd: blackBoxDecodeExePath });

    // Remove the additional unused files that are generated
    const blackboxFiles = readdirSync(blackBoxFileDirectory);
    const filesToDelete = blackboxFiles.filter(fileName => fileName.endsWith('.event') || fileName.endsWith('.gps.csv') || fileName.endsWith('.gps.gpx'));
    filesToDelete.forEach(fileName => {
        unlinkSync(path.resolve(blackBoxFileDirectory, fileName));
    });

    // Get a list of the blackbox csv file paths
    const remainingBlackboxFiles = readdirSync(blackBoxFileDirectory);
    const blackboxDataCSVs = remainingBlackboxFiles.filter(fileName => fileName.endsWith('.csv'));

    // Set the frame rate
    const fps = 30
    const secPerFrame = 1 / fps;
    const microSecPerFrame = Math.floor(secPerFrame * 1000000);

    // Transform the blackbox csv data into a file containing a list of commands for ffmpeg
    blackboxDataCSVs.forEach(fileName => {
        const csvPath = path.resolve(blackBoxFileDirectory, fileName);
        const csvParser = csvParse({
            // Handle the odd delimiters in the blackbox csv
            ltrim: true,
            columns: true,
        });
        const outputFilePath = path.resolve(blackBoxFileDirectory, `${fileName}.txt`);
        const outputFile = createWriteStream(outputFilePath);
        let logStartTime = 0;
        let previousLog = null;
        let frame = 0;
        const convertToStickPositions = transform((currentLog, next) => {
            // On the first pass, set log start time and ensure that we have a previous log
            if (!previousLog) {
                logStartTime = Number(currentLog['time (us)']);
                const stickData = {
                    leftStickX: Number(currentLog['rcCommand[2]']),
                    leftStickY: Number(currentLog['rcCommand[3]']),
                    rightStickX: Number(currentLog['rcCommand[0]']),
                    rightStickY: Number(currentLog['rcCommand[1]']),
                }

                frame += 1;
                previousLog = currentLog;

                return next(null, `${JSON.stringify(stickData)}\n`);
            }

            // Create a frame when the log time is past the frame time
            const currentFrameTime = logStartTime + (frame * microSecPerFrame);
            const currentLogTime = Number(currentLog['time (us)']);
            if (currentLogTime >= currentFrameTime) {
                // Interpolate between the previous record and current at the frame time
                const previousLogTime = Number(previousLog['time (us)']);
                const timeBetweenLogs = currentLogTime - previousLogTime;
                const interpolatedTime = currentFrameTime - previousLogTime;
                const interpolationFactor = interpolatedTime / timeBetweenLogs;

                const leftStickXAvg = (Number(previousLog['rcCommand[2]']) + Number(currentLog['rcCommand[2]'])) / 2;
                const leftStickYAvg = (Number(previousLog['rcCommand[3]']) + Number(currentLog['rcCommand[3]'])) / 2;
                const rightStickXAvg = (Number(previousLog['rcCommand[0]']) + Number(currentLog['rcCommand[0]'])) / 2;
                const rightStickYAvg = (Number(previousLog['rcCommand[1]']) + Number(currentLog['rcCommand[1]'])) / 2;
                const stickData = {
                    leftStickX: leftStickXAvg * interpolationFactor,
                    leftStickY: leftStickYAvg * interpolationFactor,
                    rightStickX: rightStickXAvg * interpolationFactor,
                    rightStickY: rightStickYAvg * interpolationFactor,
                }

                // Advance variables for next iteration
                frame += 1;
                previousLog = currentLog;

                return next(null, `${JSON.stringify(stickData)}\n`);
            }
            // Move on to the next log entry without piping data through
            return next();
        });

        createReadStream(csvPath)
            .pipe(csvParser)
            .pipe(convertToStickPositions)
            .pipe(outputFile);
    });
})();
