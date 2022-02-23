"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const csv_parse_1 = require("csv-parse");
const stream_transform_1 = require("stream-transform");
(async () => {
    const projectRootPath = path_1.default.resolve(__dirname, '../..');
    const blackBoxDecodeExePath = path_1.default.resolve(projectRootPath, 'vendor/blackbox-tools-0.4.3-windows');
    const blackBoxFileDirectory = path_1.default.resolve(projectRootPath, 'blackbox-logs');
    const blackboxFile = path_1.default.resolve(projectRootPath, blackBoxFileDirectory, 'btfl_001.bbl');
    const blackboxDecodeArgs = [blackboxFile];
    // Create the .csv file of blackbox data
    (0, child_process_1.spawnSync)('blackbox_decode.exe', blackboxDecodeArgs, { cwd: blackBoxDecodeExePath });
    // Remove the additional unused files that are generated
    const blackboxFiles = (0, fs_1.readdirSync)(blackBoxFileDirectory);
    const filesToDelete = blackboxFiles.filter(fileName => fileName.endsWith('.event') || fileName.endsWith('.gps.csv') || fileName.endsWith('.gps.gpx'));
    filesToDelete.forEach(fileName => {
        (0, fs_1.unlinkSync)(path_1.default.resolve(blackBoxFileDirectory, fileName));
    });
    // Get a list of the blackbox csv file paths
    const remainingBlackboxFiles = (0, fs_1.readdirSync)(blackBoxFileDirectory);
    const blackboxDataCSVs = remainingBlackboxFiles.filter(fileName => fileName.endsWith('.csv'));
    // Set the frame rate
    const fps = 30;
    const secPerFrame = 1 / fps;
    const microSecPerFrame = Math.floor(secPerFrame * 1000000);
    function covertToLog(logData) {
        return {
            time: Number(logData['time (us)']),
            leftStickX: Number(logData['rcCommand[2']),
            leftStickY: Number(logData['rcCommand[3]']),
            rightStickX: Number(logData['rcCommand[0]']),
            rightStickY: Number(logData['rcCommand[1']),
        };
    }
    // Transform the blackbox csv data into a file containing a list of commands for ffmpeg
    blackboxDataCSVs.forEach(fileName => {
        const csvPath = path_1.default.resolve(blackBoxFileDirectory, fileName);
        const csvParser = (0, csv_parse_1.parse)({
            // Handle the odd delimiters in the blackbox csv
            ltrim: true,
            columns: true,
        });
        const outputFilePath = path_1.default.resolve(blackBoxFileDirectory, `${fileName}.txt`);
        const outputFile = (0, fs_1.createWriteStream)(outputFilePath);
        let logStartTime = 0;
        let previousLog = null;
        let frame = 0;
        const convertToStickPositions = (0, stream_transform_1.transform)((currentLogData, next) => {
            const currentLog = covertToLog(currentLogData);
            // On the first pass, set log start time and ensure that we have a previous log
            if (!previousLog) {
                logStartTime = currentLog.time;
                const stickData = {
                    leftStickX: currentLog.leftStickX,
                    leftStickY: currentLog.leftStickY,
                    rightStickX: currentLog.rightStickX,
                    rightStickY: currentLog.rightStickY,
                };
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
                };
                // Advance variables for next iteration
                frame += 1;
                previousLog = currentLog;
                return next(null, `${JSON.stringify(stickData)}\n`);
            }
            // Move on to the next log entry without piping data through
            return next();
        });
        (0, fs_1.createReadStream)(csvPath)
            .pipe(csvParser)
            .pipe(convertToStickPositions)
            .pipe(outputFile);
    });
})();
