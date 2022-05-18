import { spawn } from 'child_process';
import {
    copyFileSync, mkdtempSync,
} from 'fs';
import { readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { FrameResolver } from './FrameResolver';
import { log } from '../logger';
import { getAsarUnpackedPath } from '../utils';
import { BlackboxFlight } from './BlackboxFlight';

export interface BlackboxLogOptions {
    logPath: string,
    frameResolver: FrameResolver,
    outputDirectoryPath: string,
}

export class BlackboxLog {
    private tempDirectory: string;

    private blackboxDecodePath: string;

    private initialLogPath: string;

    private initialLogFile: path.ParsedPath;

    private tempLogPath: string;

    private tempLogFile: path.ParsedPath;

    private frameResolver: FrameResolver;

    private outputDirectoryPath: string;

    private ffmpegPath: string;

    private blackboxFlights: BlackboxFlight[] = [];

    constructor({ logPath, frameResolver, outputDirectoryPath } = {} as BlackboxLogOptions) {
        this.frameResolver = frameResolver;
        this.tempDirectory = mkdtempSync(path.join(tmpdir(), 'gimbal-ghost-'));
        log.debug('__dirname:', __dirname);
        this.blackboxDecodePath = getAsarUnpackedPath(path.resolve(__dirname, './vendor/blackbox-tools-0.4.3-windows/blackbox_decode.exe'));
        log.debug('this.blackboxDecodePath:', this.blackboxDecodePath);
        this.ffmpegPath = getAsarUnpackedPath(path.resolve(__dirname, './vendor/ffmpeg/ffmpeg.exe'));
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
        log.info(`[${this.tempLogFile.base}] Decoding`);

        return new Promise((resolve, reject) => {
            const decodeProcess = spawn(this.blackboxDecodePath, [this.tempLogPath]);

            decodeProcess.stdout.on('data', data => {
                log.debug(`[${this.tempLogFile.base} - blackbox_decode.exe] stdout:, ${data}`);
            });

            decodeProcess.stderr.on('data', data => {
                log.debug(`[${this.tempLogFile.base} - blackbox_decode.exe] stderr:, ${data}`);
            });

            decodeProcess.on('close', code => {
                if (code === 0) {
                    this.getDecodedCSVPaths().then(csvPaths => {
                        log.info(`[${this.tempLogFile.base}] Decoded into:\n${csvPaths.join('\n')}`);
                        this.blackboxFlights = csvPaths.map(csvPath => new BlackboxFlight({
                            csvPath,
                            frameResolver: this.frameResolver,
                            outputDirectoryPath: this.outputDirectoryPath,
                        }));
                        resolve();
                    });
                }
                else {
                    const error = new Error(
                        `Decode process for ${this.tempLogFile.base} exited with non zero exit code: ${code}`,
                    );
                    reject(error);
                }
            });

            decodeProcess.on('error', error => {
                reject(error);
            });
        });
    }

    parse(): Promise<void[]> {
        log.info(`[${this.initialLogFile.base}}] Parsing`);
        const parsePromises = this.blackboxFlights.map(blackboxFlight => blackboxFlight.parse());
        return Promise.all(parsePromises);
    }

    render(): Promise<void[]> {
        log.info(`[${this.initialLogFile.base}}] Rendering`);
        const renderPromises = this.blackboxFlights.map(blackboxFlight => blackboxFlight.render());
        return Promise.all(renderPromises);
    }

    // Copy the user provided blackbox log file into
    // a temp directory to avoid polluting their directory
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
    dispose(): Promise<void> {
        return rm(this.tempDirectory, { recursive: true, force: true });
    }
}
