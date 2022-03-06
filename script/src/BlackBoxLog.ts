import { spawn } from 'child_process';
import { copyFileSync, createReadStream, createWriteStream, mkdtempSync, WriteStream } from 'fs';
import { readdir, rm } from 'fs/promises';
import { loadavg, tmpdir } from 'os';
import { parse } from 'csv-parse';
import path from 'path';
import { transform, Transformer } from 'stream-transform';
import { DemuxFilePair, LogEntry, StickPositions } from './types';
import { FrameResolver } from './FrameResolver';

export interface BlackBoxLogOptions {
    logPath: string,
    frameResolver: FrameResolver,
    outputDirectoryPath: string,
}

export class BlackBoxLog {
    private tempDirectory: string;
    private blackboxDecodePath: string;
    private initialLogPath: string;
    private initialLogFile: path.ParsedPath;
    private tempLogPath: string;
    private tempLogFile: path.ParsedPath
    private frameResolver: FrameResolver;
    private outputDirectoryPath: string;
    private ffmpegPath: string;

    constructor({ logPath, frameResolver, outputDirectoryPath } = {} as BlackBoxLogOptions) {
        this.frameResolver = frameResolver;
        this.tempDirectory = mkdtempSync(path.join(tmpdir(), 'blackbox-sticks-generator-'));
        this.blackboxDecodePath = path.resolve(__dirname, '../../vendor/blackbox-tools-0.4.3-windows');
        this.ffmpegPath = path.resolve(__dirname, '../../vendor/ffmpeg/bin');
        this.initialLogPath = logPath;
        this.initialLogFile = path.parse(this.initialLogPath);
        this.outputDirectoryPath = outputDirectoryPath;

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

    render(): Promise<void[]> {
        return this.getDemuxFilePairs().then(demuxFilePairs => {
            const renderDemuxPairPromises = demuxFilePairs.map(demuxFilePair => this.renderDemuxPair(demuxFilePair));
            return Promise.all(renderDemuxPairPromises);
        })
    }

    private renderDemuxPair({ leftDemuxFilePath, rightDemuxFilePath } = {} as DemuxFilePair): Promise<void> {
        const logName = this.getLogName(leftDemuxFilePath);
        console.log(`[${logName}] Rendering`);

        const outputFilePath = path.resolve(this.outputDirectoryPath, `${logName}.mov`)
        return new Promise((resolve, reject) => {
            const ffmpegArgs = [
                '-f', // Force the input file format
                'concat', // Use concat demuxer to get left image filenames and durations
                '-safe', // Accept all filenames from the demux file
                '0',
                '-i', // First imput is the left demux txt file
                leftDemuxFilePath,
                '-f', // Force the input file format
                'concat', // Use concat demuxer to get left image filenames and durations
                '-safe', // Accept all filenames from the demux file
                '0',
                '-i', // Second imput is the right demux txt file
                rightDemuxFilePath,
                '-filter_complex', // add padding to left image, horizontally stack them, set output fps
                `[0]pad=iw+75:color=black@0.0[left],[left][1]hstack=inputs=2,fps=${this.frameResolver.fps}`,
                '-vsync',
                'vfr', // Set the video sync method to drop timestamps 
                '-vcodec',
                'prores_ks', // Use apple prores encoding
                '-pix_fmt',
                'yuva444p10le', // Pixel format with alpha channel for transparency
                '-profile:v',
                '4444', // Set prores profile to 4444 for transparency
                '-qscale:v',
                '20', // Set quality, 1 (high) to 31 (low), and vary the bit rate accordingly
                '-y', // Overwrite outputfiles without asking
                outputFilePath,
            ];

            const ffmpegProcess = spawn('ffmpeg.exe', ffmpegArgs, { cwd: this.ffmpegPath });
            ffmpegProcess.on('close', (code, signal) => {
                if (code === 0) {
                    console.log(`[${logName}] Rendered to ${outputFilePath}`);
                    resolve();
                }
                else {
                    const error = new Error(`Render process for ${logName} exited with non zero exit code: ${code}`);
                    reject(error);
                }
            });

            ffmpegProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    private parseCSVLog(csvPath: string): Promise<void> {
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

    private logToDemuxTransform(leftDemuxFile: WriteStream, rightDemuxFile: WriteStream): Transformer {
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

                leftDemuxFile.write(`file '${leftFramePath}'\nduration ${1 / this.frameResolver.fps}\n`);
                rightDemuxFile.write(`file '${rightFramePath}'\nduration ${1 / this.frameResolver.fps}\n`);

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

                leftDemuxFile.write(`file '${leftFramePath}'\nduration ${1 / this.frameResolver.fps}\n`);
                rightDemuxFile.write(`file '${rightFramePath}'\nduration ${1 / this.frameResolver.fps}\n`);

                // Advance variables for next iteration
                frame += 1;
                previousLog = currentLog;
            }
            // Move on to the next log entry without piping data through
            return next();
        });
    }

    private convertLogDataToLogEntry(logData: any): LogEntry {
        return {
            time: Number(logData['time (us)']),
            roll: Number(logData['rcCommand[0]']),
            pitch: Number(logData['rcCommand[1]']),
            yaw: Number(logData['rcCommand[2]']),
            throttle: Number(logData['rcCommand[3]']),
        }
    }

    private interpolateStickPositions(currentLog: LogEntry, previousLog: LogEntry, currentFrameTime: number): StickPositions {
        // Interpolate between the previous record and current at the frame time
        const currentLogTime = currentLog.time;
        const timeBetweenLogs = currentLogTime - previousLog.time;
        const interpolatedTime = currentFrameTime - previousLog.time;
        const interpolationFactor = interpolatedTime / timeBetweenLogs;

        const interpolatedRoll = previousLog.roll + ((currentLog.roll - previousLog.roll) * interpolationFactor);
        const intterpolatedPitch = previousLog.pitch + ((currentLog.pitch - previousLog.pitch) * interpolationFactor);
        const interpolatedYaw = previousLog.yaw + ((currentLog.yaw - previousLog.yaw) * interpolationFactor);
        const interpolatedThrottle = previousLog.throttle + ((currentLog.throttle - previousLog.throttle) * interpolationFactor);
        const stickPositions = {
            roll: interpolatedRoll,
            pitch: intterpolatedPitch,
            yaw: interpolatedYaw,
            throttle: interpolatedThrottle,
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

    // Get the left and right ffmpeg demux files from parsing
    private async getDemuxFilePairs(): Promise<DemuxFilePair[]> {
        const tempFiles = await readdir(this.tempDirectory);
        const demuxLogNames = new Set(tempFiles
            .filter(filename => filename.endsWith('.demux.txt'))
            .map(this.getLogName)
        );

        // Create pairs of demux files
        const demuxFilePairs = [...demuxLogNames].map(logName => {
            const leftDemuxFilename = `${logName}.left.demux.txt`;
            const rightDemuxFilename = `${logName}.right.demux.txt`;
            return {
                leftDemuxFilePath: path.resolve(this.tempLogFile.dir, leftDemuxFilename),
                rightDemuxFilePath: path.resolve(this.tempLogFile.dir, rightDemuxFilename),
            } as DemuxFilePair;
        });
        return demuxFilePairs;
    }

    // Take a file path and get the log name from the filename
    private getLogName(filePath: string): string {
        const file = path.parse(filePath);
        const filename = file.base;
        return filename.replace(/\.left\.demux\.txt|\.right\.demux\.txt|\.csv|\.event|\.gps\.csv|\.gps\.gpx/, '');
    }

    // Be a good person and remove the temp directory once done
    dispose(): Promise<void> {
        return rm(this.tempDirectory, { recursive: true, force: true });
    }
}