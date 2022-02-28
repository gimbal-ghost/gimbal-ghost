import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import path from 'path';

export interface BlackBoxLogOptions {
    logPath: string,
}

export class BlackBoxLog {
    file: path.ParsedPath
    path: string;
    constructor({ logPath } = {} as BlackBoxLogOptions) {
        this.path = logPath;
        this.file = path.parse(this.path);

        if (this.file.ext !== '.bbl') {
            throw Error(`Blackbox log files must end in .bbl. Filename passed: ${this.file.base}`);
        }
    }

    decode(blackboxDecodePath: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const decodeProcess = spawn('blackbox_decode.exe', [this.path], { cwd: blackboxDecodePath });

            decodeProcess.on('close', (code, signal) => {
                if (code === 0) {
                    resolve(this.getDecodedCSVPaths())
                }
                else {
                    const error = new Error(`Decode prcoess for ${this.file.base} exited with non zero exit code: ${code}`);
                    reject(error);
                }
            });

            decodeProcess.on('error', (error) => {
                // TODO: Handle cleanup of created
                reject(error);
            });
        });

    }

    async getDecodedFiles(): Promise<string[]> {
        const filenameRegEx = new RegExp(`^${this.file.name}`);
        const filenames = await readdir(this.file.dir);
        return filenames.filter(filename => filenameRegEx.test(filename));
    }

    async getDecodedCSVPaths(): Promise<string[]> {
        const decodedFiles = await this.getDecodedFiles();
        return decodedFiles.filter(filename => filename.endsWith('.csv') && !filename.endsWith('.gps.csv')).map(filename => path.resolve(this.file.dir, filename));
    }

    async getUnusedDecodedFiles(): Promise<string[]> {
        const decodedFiles = await this.getDecodedFiles();
        return decodedFiles.filter(filename => filename.endsWith('.event') || filename.endsWith('.gps.csv') || filename.endsWith('.gps.gpx'));
    }

    dispose() {

    }
}