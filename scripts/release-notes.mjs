import { readFile, writeFile } from 'fs/promises';

// Generates release notes from the latest version in CHANGELOG.md
let changelog = await readFile('CHANGELOG.md', 'utf-8');

// Replace the version headers with a known value
const versionMarker = '_VERSION_';
const verionRegEx = /## \d.\d.\d/g;
changelog = changelog.replace(verionRegEx, versionMarker);

// Remove the initial headers
const latestVersionIndex = changelog.indexOf(versionMarker);
changelog = changelog.substring(latestVersionIndex + versionMarker.length);

// Remove previous releases
const previousVersionIndex = changelog.indexOf(versionMarker);
changelog = changelog.slice(0, previousVersionIndex);

// Create release notes
const entryRegEx = /- .*\r\n/g;
const entries = changelog.match(entryRegEx);
const releaseNotes = `## Changes in this release:\r\n\r\n${entries.join('')}`;

await writeFile('RELEASE-NOTES.md', releaseNotes);
