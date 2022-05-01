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
    updatePackageJSON: true,
    seedVersion: '0.0.0',
    createReleaseEntry({ changelogs, currentVersion, releaseVersion }) {
        const releaseDate = new Date().toLocaleString([], {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        let releaseEntry = `# ${releaseVersion} - ${releaseDate}\r\n`;
        changelogs.forEach(changelog => {
            releaseEntry += `${changelog.content}\r\n`;
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
    console.log('Setting current version from config.currentVersion');
    currentVersion = config.currentVersion;
}
// Get the version from the package.json file
else if (config.currentVersion === 'package.json') {
    console.log('Setting current version from package.json');
    currentVersion = pkg.version;
}
// Retrieve the current version from the last changelog entry if it has one
else if (config.currentVersion === 'changelog' && masterChangelogContent.match(versionRegEx)) {
    console.log('Setting current version from changelog');
    const versionMatches = masterChangelogContent.match(versionRegEx);
    [currentVersion] = versionMatches;
}
// Don't know where to get version so start at seedVersion
else {
    console.log('Setting current version from config.seedVersion');
    currentVersion = config.seedVersion;
}

// Determine if we are leaving prerelease
const currentVersionData = semver.parse(currentVersion);
const currentVersionIsPrerelease = currentVersionData?.prerelease.length;
const leavingPrerelease = !isPrerelease && currentVersionIsPrerelease;

console.log(`Current version is ${currentVersion}`);

const git = simpleGit({
    baseDir: path.resolve(path.join(__dirname, '..')),
});

// Create a list of promises that resolve to changelog metadata for each file
const changelogPromises = fs.readdirSync(changelogsDirectory)
    // Only grab changelog files both normal and previous prerelease ones
    .filter(fileName => {
        if (leavingPrerelease) {
            return fileName.endsWith('.md') && (fileName.startsWith('changelog.') || fileName.startsWith('prerelease.changelog'));
        }
        return fileName.endsWith('.md') && fileName.startsWith('changelog.');
    })
    // Extract the metadata
    .map(fileName => {
        console.log('Evaluating changelog:', fileName);
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
                    console.log('changelogMetaData', changelogMetaData);
                    return changelogMetaData;
                }
                // Changelog file indicates an uncommitted change
                return null;
            });
    });

// Convert all promises into array of changelogs
// Remove all changelogs that are uncommitted (i.e. null)
const changelogs = await (await Promise.all(changelogPromises)).filter(changelog => changelog !== null);

// Sort the changelogs from oldest to newest
const sortedChangelogs = changelogs.sort((a, b) => a.commitDate - b.commitDate);

// Sort version bumps alphabetically in order of major, minor, patch
const versionBumps = sortedChangelogs.map(changelog => changelog.versionBump).sort();
// First in the list becomes the prevailing version bump
const prevailingVersionBump = versionBumps[0];

const currentRawVersion = currentVersionData.raw;
const nextRawVersion = semver.inc(currentVersionData.raw, prevailingVersionBump);

let releaseVersion;
// Prerelease version
if (isPrerelease && prereleaseId) {
    // Current version is an exisiting prerelease and should be evaluated for major, minor, patch bump
    if (semver.gt(nextRawVersion, currentRawVersion) || !currentVersionIsPrerelease) {
        releaseVersion = semver.inc(currentVersion, `pre${prevailingVersionBump}`);
    }
    // Leave raw version alone and just increment the prerelease version
    else {
        releaseVersion = semver.inc(currentVersion, 'prerelease', prereleaseId);
    }
}
// Leaving pre-release state
else if (leavingPrerelease) {
    // Latest changelog pushes the raw version then use it
    if (semver.gt(nextRawVersion, currentRawVersion)) {
        semver.inc(currentVersion, prevailingVersionBump);
    }
    // Latest changelog doesn't modify raw version then drop the prerelease
    else {
        releaseVersion = currentRawVersion;
    }
}
// Normal release
else {
    semver.inc(currentVersion, prevailingVersionBump);
}

const releaseEntry = config.createReleaseEntry({ changelogs, currentVersion, releaseVersion });

masterChangelogContent = `${releaseEntry}\r\n\r\n${masterChangelogContent}`;

// Update the version in package.json if requested
if (config.updatePackageJSON) {
    pkg.version = releaseVersion;
    fs.writeFileSync('../package.json', JSON.stringify(pkg));
}

// Write the master changelog
fs.writeFileSync(masterChangelogPath, masterChangelogContent);

// Remove or update files based on prerelease flag
if (isPrerelease) {
    // Rename the prerelease files to prerelease.changelog.xxx.md indicating prerelease
    const renamePromises = changelogs.map(changelog => {
        const changelogPathInfo = path.parse(changelog.filePath);
        const newFileName = changelogPathInfo.base.replace('changelog', 'prerelease.changelog');
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

console.log(`Changelog updated with version ${releaseVersion} release notes`);
