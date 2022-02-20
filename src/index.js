import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, unlinkSync, createReadStream } from 'fs';
import { parse as csvParse } from 'csv-parse';

(async () => {
    const filename = fileURLToPath(import.meta.url);
    const scriptDirectory = path.dirname(filename);
    const projectRootPath = path.resolve(scriptDirectory, '..');

    const blackBoxDecodeExePath = path.resolve(projectRootPath, 'vendor/blackbox-tools-0.4.3-windows');
    const blackBoxFileDirectory = path.resolve(projectRootPath, 'blackbox-logs');
    const blackboxFile = path.resolve(projectRootPath, blackBoxFileDirectory, 'btfl_001.bbl');
    const blackboxDecodeArgs = [blackboxFile];

    // Create the .csv file of blackbox data
    spawnSync('blackbox_decode.exe', blackboxDecodeArgs, { cwd: blackBoxDecodeExePath });

    // Remove the additional unused files that are generated
    const blackboxFiles = readdirSync(blackBoxFileDirectory);
    console.log(blackboxFiles);
    const filesToDelete = blackboxFiles.filter((file) => file.endsWith('.event') || file.endsWith('.gps.csv') || file.endsWith('.gps.gpx'));
    console.log(filesToDelete);
    filesToDelete.forEach((file) => {
        unlinkSync(path.resolve(blackBoxFileDirectory, file));
    });

    // Get a list of the blackbox csv file paths

    // Transform the blackbox csv data into a list of commands for ffmpeg
})();
