import { app } from 'electron';

// Function to get path to files that are unpacked from asar
// Unpacked asar files are declared in package.json build.asarUnpack
export function getAsarUnpackedPath(asarPath: string): string {
    if (app.isPackaged) {
        return asarPath.replace('app.asar', 'app.asar.unpacked');
    }

    return asarPath;
}
