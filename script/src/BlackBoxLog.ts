import { spawn } from 'child_process';
import { copyFileSync, createReadStream, createWriteStream, mkdtempSync, rmdirSync, WriteStream } from 'fs';
import { readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { parse } from 'csv-parse';
import path from 'path';
import { transform, Transformer } from 'stream-transform';
import { LogEntry, StickPositions } from './types';
import { FrameResolver } from './FrameResolver';

export interface BlackBoxLogOptions {
    logPath: string,
    frameResolver: FrameResolver,
}

export class BlackBoxLog {
    tempDirectory: string;
    private blackboxDecodePath: string;
    initialLogPath: string;
    initialLogFile: path.ParsedPath;
    tempLogPath: string;
    tempLogFile: path.ParsedPath
    frameResolver: FrameResolver;

    constructor({ logPath, frameResolver } = {} as BlackBoxLogOptions) {
        this.frameResolver = frameResolver;
        this.tempDirectory = mkdtempSync(path.join(tmpdir(), 'blackbox-sticks-generator-'));
        this.blackboxDecodePath = path.resolve(__dirname, '../../vendor/blackbox-tools-0.4.3-windows');
        this.initialLogPath = logPath;
        this.initialLogFile = path.parse(this.initialLogPath);

        if (this.initialLogFile.ext !== '.bbl') {
            throw Error(`Blackbox log files must end in .bbl. Filename passed: ${this.initialLogFile.base}`);
        }

        // Copy log file to a temp directory before performing all operations
        this.tempLogPath = this.copyLogToTempDir();
        this.tempLogFile = path.parse(this.tempLogPath);
    }

    // Decode the blackbox file into csv files in the temp directory
    decode(): Promise<void> {
        console.log(`[${this.tempLogFile.base}] Decoding`);

        return new Promise((resolve, reject) => {
            const decodeProcess = spawn('blackbox_decode.exe', [this.tempLogPath], { cwd: this.blackboxDecodePath });

            decodeProcess.on('close', (code, signal) => {
                if (code === 0) {
                    this.getDecodedCSVPaths().then(csvPaths => {
                        console.log(`[${this.tempLogFile.base}] Decoded into:\n${csvPaths.join('\n')}`)
                        resolve();
                    });
                }
                else {
                    const error = new Error(`Decode process for ${this.tempLogFile.base} exited with non zero exit code: ${code}`);
                    reject(error);
                }
            });

            decodeProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    parse(): Promise<void[]> {
        return this.getDecodedCSVPaths().then(csvPaths => {
            const parsePromises = csvPaths.map(csvPath => this.parseCSVLog(csvPath));
            return Promise.all(parsePromises);
        });
    }

    parseCSVLog(csvPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const csvFile = path.parse(csvPath);
            console.log(`[${csvFile.base}] Parsing`);

            // Confiugre output files
            const leftDemuxOutputFilename = `${csvFile.name}.left.demux.txt`;
            const rightDemuxOutputFilename = `${csvFile.name}.right.demux.txt`;
            const leftDemuxFile = createWriteStream(path.resolve(csvFile.dir, leftDemuxOutputFilename));
            const rightDemuxFile = createWriteStream(path.resolve(csvFile.dir, rightDemuxOutputFilename));

            // Configure the csv parser
            const csvParser = parse({
                // Handle the odd delimiters with left hand spaces in the blackbox csv
                ltrim: true,
                columns: true,
            })

            createReadStream(csvPath)
                .pipe(csvParser)
                .pipe(this.logToDemuxTransform(leftDemuxFile, rightDemuxFile))
                .on('finish', () => {
                    leftDemuxFile.end();
                    rightDemuxFile.end();
                    console.log(`[${csvFile.base}] Parsed into:\n${leftDemuxOutputFilename}\n${rightDemuxOutputFilename}`);
                    resolve();
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }

    logToDemuxTransform(leftDemuxFile: WriteStream, rightDemuxFile: WriteStream): Transformer {
        let logStartTime = 0;
        let previousLog: LogEntry | null = null;
        let frame = 0;
        return transform((currentLogData, next) => {
            const currentLog = this.convertLogDataToLogEntry(currentLogData);

            // On the first pass, set log start time and ensure that we have a previous log
            if (!previousLog) {
                logStartTime = currentLog.time;
                const stickPositions = {
                    roll: currentLog.roll,
                    pitch: currentLog.pitch,
                    yaw: currentLog.yaw,
                    throttle: currentLog.throttle
                } as StickPositions;
                const { leftFramePath, rightFramePath } = this.frameResolver.generateFrameFileNames(stickPositions);

                leftDemuxFile.write(`file '${leftFramePath}'\nduration ${1 / 25}\n`);
                rightDemuxFile.write(`file '${rightFramePath}'\nduration ${1 / 25}\n`);

                frame += 1;
                previousLog = currentLog;
            }

            // Create a frame when the log time is past the frame time
            // TODO: Move microseconds per frame to Renderer class
            const currentFrameTime = logStartTime + (frame * this.frameResolver.microSecPerFrame);
            const currentLogTime = currentLog.time;
            if (currentLogTime >= currentFrameTime) {
                const stickPositions = this.interpolateStickPositions(currentLog, previousLog, currentFrameTime);
                const { leftFramePath, rightFramePath } = this.frameResolver.generateFrameFileNames(stickPositions)

                leftDemuxFile.write(`file '${leftFramePath}'\nduration ${1 / 25}\n`);
                rightDemuxFile.write(`file '${rightFramePath}'\nduration ${1 / 25}\n`);

                // Advance variables for next iteration
                frame += 1;
                previousLog = currentLog;
            }
            // Move on to the next log entry without piping data through
            return next();
        });
    }

    convertLogDataToLogEntry(logData: any): LogEntry {
        return {
            time: Number(logData['time (us)']),
            roll: Number(logData['rcCommand[0]']),
            pitch: Number(logData['rcCommand[1]']),
            yaw: Number(logData['rcCommand[2]']),
            throttle: Number(logData['rcCommand[3]']),
        }
    }

    interpolateStickPositions(currentLog: LogEntry, previousLog: LogEntry, currentFrameTime: number): StickPositions {
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

    // Copy the user provided blackbox log file into a temp directory to avoid polluting their directory
    private copyLogToTempDir(): string {
        const tempLogPath = path.join(this.tempDirectory, this.initialLogFile.base);
        copyFileSync(this.initialLogPath, tempLogPath);
        return tempLogPath;
    }

    // Get the csv file paths that were created from decoding
    private async getDecodedCSVPaths(): Promise<string[]> {
        const tempFiles = await readdir(this.tempDirectory);
        return tempFiles
            .filter(filename => filename.endsWith('.csv') && !filename.endsWith('.gps.csv'))
            .map(filename => path.resolve(this.tempLogFile.dir, filename));
    }

    // Be a good person and remove the temp directory once done
    dispose() {
        rmdirSync(this.tempDirectory);
    }
}