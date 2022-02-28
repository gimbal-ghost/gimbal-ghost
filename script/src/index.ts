import { spawnSync } from 'child_process';
import path from 'path';
import { readdirSync, unlinkSync, createReadStream, createWriteStream } from 'fs';
import { parse } from 'csv-parse';
import { transform } from 'stream-transform';
import { StickFrameInfo, StickPositions, Log, FramePaths, TransmitterModes } from './types';
import { clamp, scale, nearest } from './utils';

// TODO: Implement error handling
// TODO: Implement args
(async () => {
    const projectRootPath = path.resolve(__dirname, '../..');

    // Get the stick frame metadata from the manifest
    const stickManifestFilePath = path.resolve(__dirname, '../../sticks/manifest.json');
    const sitckDirectory = path.dirname(stickManifestFilePath);
    const stickFrameInfo: StickFrameInfo = require(stickManifestFilePath);
    const stickFramesDirectory = path.resolve(sitckDirectory, stickFrameInfo.frames.location);

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

    // Convert the log stick position to a frame position that is within the allowable frames
    function getFramePosition(value: number, initialMin: number, initialMax: number, finalMin: number, finalMax: number, increment: number): number {
        const clampedValue = clamp(value, initialMin, initialMax);
        const scaledValue = scale(clampedValue, initialMin, initialMax, finalMin, finalMax);
        const nearestFrameValue = nearest(scaledValue, finalMin, finalMax, increment);
        return nearestFrameValue;
    }

    // Take the stick positions at certain frame and generate the prerendered frame path
    function generateFrameFileNames(stickPositions: StickPositions, stickFrameInfo: StickFrameInfo, mode: TransmitterModes): FramePaths {
        const frameStickPositions = {
            roll: getFramePosition(stickPositions.roll, -500, 500, stickFrameInfo.frames.x.min, stickFrameInfo.frames.x.max, stickFrameInfo.frames.x.increment),
            pitch: getFramePosition(stickPositions.pitch, -500, 500, stickFrameInfo.frames.y.min, stickFrameInfo.frames.y.max, stickFrameInfo.frames.y.increment),
            yaw: getFramePosition(stickPositions.yaw, -500, 500, stickFrameInfo.frames.x.min, stickFrameInfo.frames.x.max, stickFrameInfo.frames.x.increment),
            throttle: getFramePosition(stickPositions.yaw, 1000, 2000, stickFrameInfo.frames.y.min, stickFrameInfo.frames.y.max, stickFrameInfo.frames.y.increment),
        } as StickPositions

        switch (mode) {
            case TransmitterModes.Mode1:
                return {
                    left: path.resolve(stickFramesDirectory, stickFrameInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.yaw.toString()).replace('<y>', frameStickPositions.pitch.toString())),
                    right: path.resolve(stickFramesDirectory, stickFrameInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.roll.toString()).replace('<y>', frameStickPositions.throttle.toString())),
                } as FramePaths
            case TransmitterModes.Mode2:
                return {
                    left: path.resolve(stickFramesDirectory, stickFrameInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.yaw.toString()).replace('<y>', frameStickPositions.throttle.toString())),
                    right: path.resolve(stickFramesDirectory, stickFrameInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.roll.toString()).replace('<y>', frameStickPositions.pitch.toString())),
                } as FramePaths
            case TransmitterModes.Mode3:
                return {
                    left: path.resolve(stickFramesDirectory, stickFrameInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.roll.toString()).replace('<y>', frameStickPositions.pitch.toString())),
                    right: path.resolve(stickFramesDirectory, stickFrameInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.yaw.toString()).replace('<y>', frameStickPositions.throttle.toString())),
                } as FramePaths
            default:
                return {
                    left: path.resolve(stickFramesDirectory, stickFrameInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.roll.toString()).replace('<y>', frameStickPositions.throttle.toString())),
                    right: path.resolve(stickFramesDirectory, stickFrameInfo.frames.fileNameFormat.replace('<x>', frameStickPositions.yaw.toString()).replace('<y>', frameStickPositions.pitch.toString())),
                } as FramePaths
        }
    }

    // Take two logs and interpolate the stick positions between them
    function interpolateStickPositions(currentLog: Log, previousLog: Log, currentFrameTime: number): StickPositions {
        // Interpolate between the previous record and current at the frame time
        const currentLogTime = currentLog.time;
        const timeBetweenLogs = currentLogTime - previousLog.time;
        const interpolatedTime = currentFrameTime - previousLog.time;
        const interpolationFactor = interpolatedTime / timeBetweenLogs;

        const rollAvg = (previousLog.roll + currentLog.roll) / 2;
        const pitchAvg = (previousLog.pitch + currentLog.pitch) / 2;
        const yawAvg = (previousLog.yaw + currentLog.yaw) / 2;
        const throttleAvg = (previousLog.throttle + currentLog.throttle) / 2;
        const stickPositions = {
            roll: rollAvg * interpolationFactor,
            pitch: pitchAvg * interpolationFactor,
            yaw: yawAvg * interpolationFactor,
            throttle: throttleAvg * interpolationFactor,
        } as StickPositions
        return stickPositions;
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
        const leftOutputFileName = `${fileName.replace('.csv', '')}.left.demux.txt`;
        const leftOutputFilePath = path.resolve(blackBoxFileDirectory, leftOutputFileName);
        const leftStickFFMPEGDemuxFile = createWriteStream(leftOutputFilePath);
        const rightOutputFileName = `${fileName.replace('.csv', '')}.right.demux.txt`;
        const rightOutputFilePath = path.resolve(blackBoxFileDirectory, rightOutputFileName);
        const rightStickFFMPEGDemuxFile = createWriteStream(rightOutputFilePath);

        // Create the stream transform for each row of data
        let logStartTime = 0;
        let previousLog: Log | null = null;
        let frame = 0;
        const convertToStickPositions = transform((currentLogData, next) => {
            const currentLog = covertToLog(currentLogData);
            // On the first pass, set log start time and ensure that we have a previous log
            if (!previousLog) {
                logStartTime = currentLog.time;
                const stickPositions = {
                    roll: currentLog.roll,
                    pitch: currentLog.pitch,
                    yaw: currentLog.yaw,
                    throttle: currentLog.throttle,
                } as StickPositions;
                // TODO: Make mode configurable
                const frameFileNames = generateFrameFileNames(stickPositions, stickFrameInfo, TransmitterModes.Mode2)

                frame += 1;
                previousLog = currentLog;

                leftStickFFMPEGDemuxFile.write(`file '${frameFileNames.left}'\nduration ${1 / 25}\n`);
                rightStickFFMPEGDemuxFile.write(`file '${frameFileNames.right}'\nduration ${1 / 25}\n`);
            }

            // Create a frame when the log time is past the frame time
            const currentFrameTime = logStartTime + (frame * microSecPerFrame);
            const currentLogTime = currentLog.time;
            if (currentLogTime >= currentFrameTime) {
                const stickPositions = interpolateStickPositions(currentLog, previousLog, currentFrameTime);
                // TODO: Make mode configurable
                const frameFileNames = generateFrameFileNames(stickPositions, stickFrameInfo, TransmitterModes.Mode2)

                // Advance variables for next iteration
                frame += 1;
                previousLog = currentLog;

                leftStickFFMPEGDemuxFile.write(`file '${frameFileNames.left}'\nduration ${1 / 25}\n`);
                rightStickFFMPEGDemuxFile.write(`file '${frameFileNames.right}'\nduration ${1 / 25}\n`);
            }
            // Move on to the next log entry without piping data through
            return next();
        });

        createReadStream(csvPath)
            .pipe(csvParser)
            .pipe(convertToStickPositions)
            .on('end', () => {
                leftStickFFMPEGDemuxFile.end();
                rightStickFFMPEGDemuxFile.end();
            });
    });
})();
