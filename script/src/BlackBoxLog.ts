import { spawn } from 'child_process';
import { copyFileSync, mkdtempSync, rmdirSync } from 'fs';
import { readdir } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { Renderer } from './Renderer';

export interface BlackBoxLogOptions {
    logPath: string,
}

export class BlackBoxLog {
    tempDirectory: string;
    private blackboxDecodePath: string;
    initialLogPath: string;
    initialLogFile: path.ParsedPath;
    tempLogPath: string;
    tempLogFile: path.ParsedPath

    constructor({ logPath } = {} as BlackBoxLogOptions) {
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
                    const error = new Error(`Decode prcoess for ${this.tempLogFile.base} exited with non zero exit code: ${code}`);
                    reject(error);
                }
            });

            decodeProcess.on('error', (error) => {
                reject(error);
            });
        });
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