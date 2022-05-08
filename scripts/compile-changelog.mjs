/* eslint-disable no-underscore-dangle */
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import simpleGit from 'simple-git';
import semver from 'semver';
import process from 'process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
let config = require('../.changelogs/.changelog.js');
const pkg = require('../package.json');

const args = process.argv.slice(2);
const isPrerelease = args.length && (args[0] === '-p' || args[0] === '--prerelease');
const prereleaseId = args.length >= 2 ? args[1] : null;
const changelogsDirectory = path.join(__dirname, '..', '.changelogs');
const versionBumpRegEx = /^major|^minor|^patch/ig;
// Taken from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
// Used to see if entire string is version
const versionOnlyRegEx = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
// used to see if multiple versions are found in string
const versionRegEx = /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g;

if (isPrerelease && !prereleaseId) {
    console.error('Prerelease flag was passed but prerelease identifier is missing');
    process.exit(1);
}

const configDefaults = {
    changelogOutput: '../CHANGELOG.md',
    currentVersion: 'package.json',
    seedVersion: '0.0.0',
    createReleaseEntry({ changelogs, releaseVersion }) {
        const releaseDate = new Date().toLocaleString([], {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZoneName: 'short',
        });

        let releaseEntry = `# v${releaseVersion} - ${releaseDate}\n\n## Changes in this Release\n\n`;

        changelogs.forEach(changelog => {
            releaseEntry += `${changelog.content}\n`;
        });

        releaseEntry = releaseEntry.trim();

        return releaseEntry;
    },
};
config = {
    ...configDefaults,
    ...config,
};

// Determine if an existing master changelog.md file exists, if so pick up where it left off
const masterChangelogPath = path.resolve(changelogsDirectory, config.changelogOutput);
let masterChangelogContent = '';
if (fs.existsSync(masterChangelogPath)) {
    masterChangelogContent = fs.readFileSync(masterChangelogPath, { encoding: 'utf8' });
}

// Get the current version if passed then use it, if omittted then use the seed
let currentVersion;
if (versionOnlyRegEx.test(config.currentVersion)) {
    console.log('Getting current version from config.currentVersion');
    currentVersion = config.currentVersion;
}
// Get the version from the package.json file
else if (config.currentVersion === 'package.json') {
    console.log('Getting current version from package.json');
    currentVersion = pkg.version;
}
// Retrieve the current version from the last changelog entry if it has one
else if (config.currentVersion === 'changelog' && masterChangelogContent.match(versionRegEx)) {
    console.log('Getting current version from changelog');
    const versionMatches = masterChangelogContent.match(versionRegEx);
    [currentVersion] = versionMatches;
}
// Don't know where to get version so start at seedVersion
else {
    console.log('Getting current version from config.seedVersion');
    currentVersion = config.seedVersion;
}

// Determine if we are leaving prerelease
const currentVersionData = semver.parse(currentVersion);
const currentVersionIsPrerelease = currentVersionData?.prerelease.length;
const leavingPrerelease = !isPrerelease && currentVersionIsPrerelease;
const enteringPrerelease = isPrerelease && !currentVersionIsPrerelease;

console.log(`Current version is ${currentVersion}`);

const git = simpleGit({
    baseDir: path.resolve(path.join(__dirname, '..')),
});

// Create a list of promises that resolve to changelog metadata for each file
const changelogPromises = fs.readdirSync(changelogsDirectory)
    // Only grab changelog files both normal and previous prerelease ones
    .filter(fileName => {
        if (leavingPrerelease) {
            return fileName.endsWith('.md') && (fileName.startsWith('changelog.') || fileName.startsWith('pre.changelog'));
        }
        return fileName.endsWith('.md') && fileName.startsWith('changelog.');
    })
    // Extract the metadata
    .map(fileName => {
        const filePath = path.resolve(changelogsDirectory, fileName);

        // use git log to find the commit date
        return git.log({
            file: filePath,
        })
            .then(log => {
                // Find the first commit date for this file
                const firstCommit = log.all.pop();

                // Ensure that file has associated commit (i.e. it has been merged)
                if (firstCommit) {
                    // Find the release type, i.e. major, minor, patch
                    const rawContent = fs.readFileSync(filePath, { encoding: 'utf8' });
                    const versionBump = rawContent.match(versionBumpRegEx)[0].toLowerCase();

                    // Remove the version bump from the changelog
                    const content = rawContent.replace(versionBumpRegEx, '').trim();

                    const changelogMetaData = {
                        filePath,
                        fileName,
                        commit: firstCommit,
                        commitHash: firstCommit.hash,
                        commitDate: new Date(firstCommit.date),
                        commitMessage: firstCommit.message,
                        commitBody: firstCommit.body,
                        commitRefs: firstCommit.refs,
                        commitAuthorName: firstCommit.author_name,
                        commitAuthorEmail: firstCommit.author_email,
                        versionBump,
                        content,
                    };
                    return changelogMetaData;
                }
                // Changelog file indicates an uncommitted change
                return null;
            });
    });

// Convert all promises into array of changelogs
// Remove all changelogs that are uncommitted (i.e. null)
const changelogs = await (await Promise.all(changelogPromises)).filter(changelog => changelog !== null);

if (changelogs.length === 0) {
    console.error(`No committed changelogs found in ${changelogsDirectory}`);
    process.exit(1);
}

// Sort the changelogs from oldest to newest
const sortedChangelogs = changelogs.sort((a, b) => a.commitDate - b.commitDate);

// Sort version bumps alphabetically in order of major, minor, patch
const versionBumps = sortedChangelogs.map(changelog => changelog.versionBump).sort();
// First in the list becomes the prevailing version bump
const prevailingVersionBump = versionBumps[0];

const currentMajorMinorPatch = `${currentVersionData.major}.${currentVersionData.minor}.${currentVersionData.patch}`;

let releaseVersion;
// Prerelease version
if (isPrerelease && prereleaseId) {
    // Current version is an exisiting prerelease and should be evaluated for major, minor, patch bump
    const initialVersion = pkg.changelog.prereleaseInitialVersion;
    const changelogBumpVersion = semver.inc(initialVersion, prevailingVersionBump);
    if (semver.gt(changelogBumpVersion, currentMajorMinorPatch) || !currentVersionIsPrerelease) {
        releaseVersion = semver.inc(initialVersion, `pre${prevailingVersionBump}`, prereleaseId);
    }
    // Leave raw version alone and just increment the prerelease version
    else {
        releaseVersion = semver.inc(currentVersion, 'prerelease', prereleaseId);
    }
}
// Leaving pre-release state
else if (leavingPrerelease) {
    // Latest changelog pushes the raw version then use it
    const changelogBumpVersion = semver.inc(pkg.changelog.prereleaseInitialVersion, prevailingVersionBump);
    releaseVersion = semver.gt(changelogBumpVersion, currentMajorMinorPatch) ? changelogBumpVersion : currentMajorMinorPatch;
}
// Normal release
else {
    releaseVersion = semver.inc(currentVersion, prevailingVersionBump);
}

// Update the version in package.json
pkg.version = releaseVersion;
// If we are entering prerelease then save the initial version
if (enteringPrerelease) {
    if (!pkg.changelog) {
        pkg.changelog = {};
    }
    pkg.changelog.prereleaseInitialVersion = currentVersion;
}
// Save the updated package.json
fs.writeFileSync(path.join(__dirname, '..', 'package.json'), JSON.stringify(pkg, null, 4));

const releaseEntry = config.createReleaseEntry({
    changelogs,
    currentVersion,
    releaseVersion,
    leavingPrerelease,
    enteringPrerelease,
});

masterChangelogContent = `${releaseEntry}\n\n\n${masterChangelogContent}`;

// Write the master changelog
fs.writeFileSync(masterChangelogPath, masterChangelogContent);

// Remove or update files based on prerelease flag
if (isPrerelease) {
    // Rename the prerelease files to prerelease.changelog.xxx.md indicating prerelease
    const renamePromises = changelogs.map(changelog => {
        const changelogPathInfo = path.parse(changelog.filePath);
        const newFileName = changelogPathInfo.base.replace('changelog', 'pre.changelog');
        const renamedFilePath = path.resolve(changelogPathInfo.dir, newFileName);
        return fsPromises.rename(changelog.filePath, renamedFilePath);
    });
    await Promise.all(renamePromises);
}
else {
    // Remove all the changelogs as they are now part of the master changelog
    const deletePromises = changelogs.map(changelog => fsPromises.rm(changelog.filePath));
    await Promise.all(deletePromises);
}

console.log(`Version updated to ${releaseVersion}`);
