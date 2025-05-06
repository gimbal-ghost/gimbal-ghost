import { spawn } from 'child_process';
import {
    copyFileSync, mkdtempSync,
} from 'fs';
import { readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { FrameResolver } from './FrameResolver';
import { log } from '../logger';
import { getVendorToolPath } from '../utils';
import { BlackboxFlight } from './BlackboxFlight';
import { AllowedLogExtensions } from './types';

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

    private blackboxFlights: BlackboxFlight[] = [];

    constructor({ logPath, frameResolver, outputDirectoryPath } = {} as BlackboxLogOptions) {
        this.frameResolver = frameResolver;
        this.tempDirectory = mkdtempSync(path.join(tmpdir(), 'gimbal-ghost-'));
        this.blackboxDecodePath = getVendorToolPath('blackbox_decode');
        log.debug('this.blackboxDecodePath:', this.blackboxDecodePath);
        this.initialLogPath = logPath;
        this.initialLogFile = path.parse(this.initialLogPath);
        this.outputDirectoryPath = outputDirectoryPath;

        if (![AllowedLogExtensions.BBL, AllowedLogExtensions.BFL, AllowedLogExtensions.CSV]
            .includes(this.initialLogFile.ext.toLowerCase().replace('.', '') as AllowedLogExtensions)) {
            throw Error(`Blackbox log files must end in .bbl, .bfl, or .csv. Filename passed: ${this.initialLogFile.base}`);
        }

        // Copy log file to a temp directory before performing all operations
        this.tempLogPath = this.copyLogToTempDir();
        this.tempLogFile = path.parse(this.tempLogPath);
    }

    // Decode the blackbox file into csv files in the temp directory
    decode(): Promise<void> {
        log.info(`[${this.tempLogFile.base}] Decoding`);

        if (this.initialLogFile.ext.toLowerCase() === AllowedLogExtensions.CSV) {
            return new Promise(resolve => {
                this.blackboxFlights = [new BlackboxFlight({
                    csvPath: this.tempLogPath,
                    blackboxLogPath: this.initialLogPath,
                    frameResolver: this.frameResolver,
                    outputDirectoryPath: this.outputDirectoryPath,
                })];
                resolve();
            });
        }

        return new Promise((resolve, reject) => {
            const decodeProcess = spawn(this.blackboxDecodePath, [this.tempLogPath]);

            decodeProcess.stdout.on('data', data => {
                log.debug(`[${this.tempLogFile.base} - blackbox_decode] stdout:, ${data}`);
            });

            decodeProcess.stderr.on('data', data => {
                log.debug(`[${this.tempLogFile.base} - blackbox_decode] stderr:, ${data}`);
            });

            decodeProcess.on('close', code => {
                if (code === 0) {
                    this.getDecodedCSVPaths().then(csvPaths => {
                        log.info(`[${this.tempLogFile.base}] Decoded into:\n${csvPaths.join('\n')}`);
                        this.blackboxFlights = csvPaths.map(csvPath => new BlackboxFlight({
                            csvPath,
                            blackboxLogPath: this.initialLogPath,
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
