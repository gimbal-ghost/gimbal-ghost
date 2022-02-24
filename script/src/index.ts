import { spawnSync } from 'child_process';
import path from 'path';
import { readdirSync, unlinkSync, createReadStream, createWriteStream } from 'fs';
import { parse } from 'csv-parse';
import { transform } from 'stream-transform';
import { StickFrameInfo, StickPositions, Log, FramePaths, TransmitterModes } from './types';

(async () => {
    const projectRootPath = path.resolve(__dirname, '../..');

    // Get the stick frame metadata from the manifest
    const stickFrameInfo: StickFrameInfo = require('../../sticks/manifest.json');

    // Create the .csv file of blackbox data
    const blackBoxFileDirectory = path.resolve(projectRootPath, 'blackbox-logs');
    const blackboxFilePath = path.resolve(projectRootPath, blackBoxFileDirectory, 'btfl_001.bbl');
    const blackboxDecodeArgs = [blackboxFilePath];
    const blackBoxDecodeExePath = path.resolve(projectRootPath, 'vendor/blackbox-tools-0.4.3-windows');
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

    // Convert a CSV parsed row as an object and convert to log object
    function covertToLog(logData: any): Log {
        return {
            time: Number(logData['time (us)']),
            roll: Number(logData['rcCommand[0]']),
            pitch: Number(logData['rcCommand[1]']),
            yaw: Number(logData['rcCommand[2]']),
            throttle: Number(logData['rcCommand[3]']),
        }
    }

    // Convert a number from one scale to another scale
    function scale(initialValue: number, initialMin: number, initialMax: number, finalMin: number, finalMax: number): number {
        const initialRange = initialMax - initialMin;
        const finalRange = finalMax - finalMin;
        const fractionOfInitial = (initialValue - initialMin) / initialRange;
        const finalValue = (fractionOfInitial * finalRange) + finalMin;
        return finalValue;
    }

    function clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(min, value), max);
    }

    // Take the stick positions at certain frame and generate the prerendered frame path
    function generateFrameFileNames(stickPositions: StickPositions, stickFrameInfo: StickFrameInfo, mode: TransmitterModes): FramePaths {
        // TODO: Left off here
        const clampedScaledRoundedStickPositions = {
            roll: clamp(stickPositions.roll, -500, 500),
            pitch: clamp(stickPositions.pitch, -500, 500),
            yaw: clamp(stickPositions.yaw, -500, 500),
            throttle: clamp(stickPositions.throttle, 1000, 2000),
        } as StickPositions

        switch (mode) {
            case TransmitterModes.Mode1:
            case TransmitterModes.Mode2:
            case TransmitterModes.Mode3:
            case TransmitterModes.Mode4:
        }

        return {
            left: '',
            right: '',
        }
    }

    // Transform the blackbox csv data into a file containing a list of commands for ffmpeg
    blackboxDataCSVs.forEach(fileName => {
        // Create the csv parser
        const csvPath = path.resolve(blackBoxFileDirectory, fileName);
        const csvParser = parse({
            // Handle the odd delimiters with left hand spaces in the blackbox csv
            ltrim: true,
            columns: true,
        });

        // Creat the outputfile
        const outputFileName = `${fileName.replace('.csv', '')}.txt`;
        const outputFilePath = path.resolve(blackBoxFileDirectory, outputFileName);
        const outputFile = createWriteStream(outputFilePath);

        // Create the stream transform for each row of data
        let logStartTime = 0;
        let previousLog: Log | null = null;
        let frame = 0;
        const convertToStickPositions = transform((currentLogData, next) => {
            const currentLog = covertToLog(currentLogData);
            // On the first pass, set log start time and ensure that we have a previous log
            if (!previousLog) {
                logStartTime = currentLog.time;
                const stickData = {
                    roll: currentLog.roll,
                    pitch: currentLog.pitch,
                    yaw: currentLog.yaw,
                    throttle: currentLog.throttle,
                } as StickPositions

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

                const rollAvg = (previousLog.roll + currentLog.roll) / 2;
                const pitchAvg = (previousLog.pitch + currentLog.pitch) / 2;
                const yawAvg = (previousLog.yaw + currentLog.yaw) / 2;
                const throttleAvg = (previousLog.throttle + currentLog.throttle) / 2;
                const stickData = {
                    roll: rollAvg * interpolationFactor,
                    pitch: pitchAvg * interpolationFactor,
                    yaw: yawAvg * interpolationFactor,
                    throttle: throttleAvg * interpolationFactor,
                } as StickPositions

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
