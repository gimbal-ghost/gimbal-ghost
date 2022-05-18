import { createReadStream, createWriteStream, WriteStream } from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { transform, Transformer } from 'stream-transform';
import { spawn } from 'child_process';
import { log } from '../logger';
import { DemuxFilePair, LogEntry, StickPositions } from './types';
import { FrameResolver } from './FrameResolver';
import { getAsarUnpackedPath } from '../utils';

export interface BlackboxFlightOptions {
    csvPath: string,
    frameResolver: FrameResolver,
    outputDirectoryPath: string,
}

export class BlackboxFlight {
    private csvPath: string;

    private csvPathInfo: path.ParsedPath;

    private blackboxLogName: string | undefined;

    private flightNumber: number;

    private frameResolver: FrameResolver;

    private outputFilePath: string;

    private demuxFilePair: DemuxFilePair;

    private ffmpegPath: string;

    constructor({ csvPath, frameResolver, outputDirectoryPath } = {} as BlackboxFlightOptions) {
        this.csvPath = csvPath;
        this.csvPathInfo = path.parse(this.csvPath);

        const csvPathRegEx = /^(?<blackboxLogName>.+(?=\.\d{2}))\.(?<flightNumber>\d{2})/g;
        const matches = [...this.csvPathInfo.name.matchAll(csvPathRegEx)];
        const matchGroups = matches[0]?.groups;
        this.blackboxLogName = matchGroups?.blackboxLogName || 'log name unknown';
        this.flightNumber = parseInt(matchGroups?.flightNumber || '00', 10);

        this.frameResolver = frameResolver;
        this.outputFilePath = path.resolve(outputDirectoryPath, `${this.blackboxLogName} flight ${this.flightNumber}.mov`);

        const leftDemuxOutputFilename = `${this.csvPathInfo.name}.left.demux.txt`;
        const rightDemuxOutputFilename = `${this.csvPathInfo.name}.right.demux.txt`;
        this.demuxFilePair = {
            leftDemuxFilePath: path.resolve(this.csvPathInfo.dir, leftDemuxOutputFilename),
            rightDemuxFilePath: path.resolve(this.csvPathInfo.dir, rightDemuxOutputFilename),
        };

        this.ffmpegPath = getAsarUnpackedPath(path.resolve(__dirname, './vendor/ffmpeg/ffmpeg.exe'));
    }

    parse(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Confiugre output files
            const leftDemuxFile = createWriteStream(this.demuxFilePair.leftDemuxFilePath);
            const rightDemuxFile = createWriteStream(this.demuxFilePair.rightDemuxFilePath);

            // Configure the csv parser
            const csvParser = parse({
                // Handle the odd delimiters with left hand spaces in the blackbox csv
                ltrim: true,
                columns: true,
            });

            createReadStream(this.csvPath)
                .pipe(csvParser)
                .pipe(this.logToDemuxTransform(leftDemuxFile, rightDemuxFile))
                .on('finish', () => {
                    leftDemuxFile.end();
                    rightDemuxFile.end();
                    log.info(
                        `[${this.csvPathInfo.base}] Parsed into:\n${this.demuxFilePair.leftDemuxFilePath}\n${this.demuxFilePair.rightDemuxFilePath}`,
                    );
                    resolve();
                })
                .on('error', error => {
                    reject(error);
                });
        });
    }

    render(): Promise<void> {
        return new Promise((resolve, reject) => {
            const ffmpegArgs = [
                '-loglevel', // Set options for logging
                'repeat+level+info', // Repeat logs, add the log level to each, set to info
                '-hide_banner', // Remove copyright, build, library versions
                '-f', // Force the input file format
                'concat', // Use concat demuxer to get left image filenames and durations
                '-safe', // Accept all filenames from the demux file
                '0',
                '-i', // First imput is the left demux txt file
                this.demuxFilePair.leftDemuxFilePath,
                '-f', // Force the input file format
                'concat', // Use concat demuxer to get left image filenames and durations
                '-safe', // Accept all filenames from the demux file
                '0',
                '-i', // Second imput is the right demux txt file
                this.demuxFilePair.rightDemuxFilePath,
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
                '1', // Set quality, 1 (high) to 31 (low), and vary the bit rate accordingly
                '-y', // Overwrite outputfiles without asking
                this.outputFilePath,
            ];

            const ffmpegProcess = spawn(this.ffmpegPath, ffmpegArgs);
            ffmpegProcess.on('close', code => {
                if (code === 0) {
                    log.info(`[${this.csvPathInfo.name}] Rendered to ${this.outputFilePath}`);
                    resolve();
                }
                else {
                    const error = new Error(`Render process for ${this.csvPathInfo.name} exited with non zero exit code: ${code}`);
                    reject(error);
                }
            });

            ffmpegProcess.stdout.on('data', data => {
                log.debug(`[${this.csvPathInfo.name} - ffmpeg.exe] stdout: ${data}`);
            });

            ffmpegProcess.stderr.on('data', data => {
                log.debug(`[${this.csvPathInfo.name} - ffmpeg.exe] stderr: ${data}`);
            });

            ffmpegProcess.on('error', error => {
                reject(error);
            });
        });
    }

    private logToDemuxTransform(
        leftDemuxFile: WriteStream,
        rightDemuxFile: WriteStream,
    ): Transformer {
        let logStartTime = 0;
        let previousLog: LogEntry | null = null;
        let frame = 0;

        return transform((currentLogData, next) => {
            const currentLog = BlackboxFlight.convertLogDataToLogEntry(currentLogData);

            // On the first pass, set log start time and ensure that we have a previous log
            if (!previousLog) {
                logStartTime = currentLog.time;
                const stickPositions = {
                    roll: currentLog.roll,
                    pitch: currentLog.pitch,
                    yaw: currentLog.yaw,
                    throttle: currentLog.throttle,
                } as StickPositions;
                const { leftFramePath, rightFramePath } = this.frameResolver
                    .generateFrameFileNames(stickPositions);

                leftDemuxFile.write(`file '${leftFramePath}'\nduration ${1 / this.frameResolver.fps}\n`);
                rightDemuxFile.write(`file '${rightFramePath}'\nduration ${1 / this.frameResolver.fps}\n`);

                frame += 1;
                previousLog = currentLog;
            }

            // Create a frame when the log time is past the frame time
            const currentFrameTime = logStartTime + (frame * this.frameResolver.microSecPerFrame);
            const currentLogTime = currentLog.time;
            if (currentLogTime >= currentFrameTime) {
                const stickPositions = BlackboxFlight.interpolateStickPositions(
                    currentLog,
                    previousLog,
                    currentFrameTime,
                );
                const { leftFramePath, rightFramePath } = this.frameResolver
                    .generateFrameFileNames(stickPositions);

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

    static convertLogDataToLogEntry(logData: any): LogEntry {
        return {
            time: Number(logData['time (us)']),
            roll: Number(logData['rcCommand[0]']),
            pitch: Number(logData['rcCommand[1]']),
            yaw: Number(logData['rcCommand[2]']),
            throttle: Number(logData['rcCommand[3]']),
        };
    }

    static interpolateStickPositions(
        currentLog: LogEntry,
        previousLog: LogEntry,
        currentFrameTime: number,
    ): StickPositions {
        // Interpolate between the previous record and current at the frame time
        const currentLogTime = currentLog.time;
        const timeBetweenLogs = currentLogTime - previousLog.time;
        const interpolatedTime = currentFrameTime - previousLog.time;
        const interpolationFactor = interpolatedTime / timeBetweenLogs;

        const interpolatedRoll = previousLog.roll
            + ((currentLog.roll - previousLog.roll) * interpolationFactor);
        const intterpolatedPitch = previousLog.pitch
            + ((currentLog.pitch - previousLog.pitch) * interpolationFactor);
        const interpolatedYaw = previousLog.yaw
            + ((currentLog.yaw - previousLog.yaw) * interpolationFactor);
        const interpolatedThrottle = previousLog.throttle
            + ((currentLog.throttle - previousLog.throttle) * interpolationFactor);
        const stickPositions = {
            roll: interpolatedRoll,
            pitch: intterpolatedPitch,
            yaw: interpolatedYaw,
            throttle: interpolatedThrottle,
        } as StickPositions;
        return stickPositions;
    }
}
