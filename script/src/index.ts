import { spawnSync } from 'child_process';
import path from 'path';
import { readdirSync, unlinkSync, createReadStream, createWriteStream } from 'fs';
import { parse } from 'csv-parse';
import { transform } from 'stream-transform';

(async () => {
    const projectRootPath = path.resolve(__dirname, '../..');

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

    interface Log {
        time: number,
        leftStickX: number,
        leftStickY: number,
        rightStickX: number,
        rightStickY: number,
    }

    function covertToLog(logData: any): Log {
        return {
            time: Number(logData['time (us)']),
            leftStickX: Number(logData['rcCommand[2]']),
            leftStickY: Number(logData['rcCommand[3]']),
            rightStickX: Number(logData['rcCommand[0]']),
            rightStickY: Number(logData['rcCommand[1]']),
        }
    }

    // Transform the blackbox csv data into a file containing a list of commands for ffmpeg
    blackboxDataCSVs.forEach(fileName => {
        const csvPath = path.resolve(blackBoxFileDirectory, fileName);
        const csvParser = parse({
            // Handle the odd delimiters in the blackbox csv
            ltrim: true,
            columns: true,
        });
        const outputFilePath = path.resolve(blackBoxFileDirectory, `${fileName}.txt`);
        const outputFile = createWriteStream(outputFilePath);
        let logStartTime = 0;
        let previousLog: Log | null = null;
        let frame = 0;
        const convertToStickPositions = transform((currentLogData, next) => {
            const currentLog = covertToLog(currentLogData);
            // On the first pass, set log start time and ensure that we have a previous log
            if (!previousLog) {
                logStartTime = currentLog.time;
                const stickData = {
                    leftStickX: currentLog.leftStickX,
                    leftStickY: currentLog.leftStickY,
                    rightStickX: currentLog.rightStickX,
                    rightStickY: currentLog.rightStickY,
                }

                frame += 1;
                previousLog = currentLog;

                return next(null, `${JSON.stringify(stickData)}\n`);
            }

            // Create a frame when the log time is past the frame time
            const currentFrameTime = logStartTime + (frame * microSecPerFrame);
            const currentLogTime = Number(currentLog.time);
            if (currentLogTime >= currentFrameTime) {
                // Interpolate between the previous record and current at the frame time
                const timeBetweenLogs = currentLogTime - previousLog.time;
                const interpolatedTime = currentFrameTime - previousLog.time;
                const interpolationFactor = interpolatedTime / timeBetweenLogs;

                const leftStickXAvg = (previousLog.leftStickX + currentLog.leftStickX) / 2;
                const leftStickYAvg = (previousLog.leftStickY + currentLog.leftStickY) / 2;
                const rightStickXAvg = (previousLog.rightStickX + currentLog.rightStickX) / 2;
                const rightStickYAvg = (previousLog.rightStickY + currentLog.rightStickY) / 2;
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
