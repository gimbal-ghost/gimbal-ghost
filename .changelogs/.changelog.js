const fs = require('fs');
const path = require('path');

function createReleaseEntry({ changelogs, releaseVersion }) {
    const releaseDate = new Date().toLocaleString([], {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZoneName: 'short',
    });

    let releaseEntry = `### Changes in this Release\n\n`;

    // Get a list of all indiviudal changes (i.e. each line from the changelogs)
    const allChanges = changelogs.reduce((all, changelog) => {
        // Each change is on its own line
        const lines = changelog.content.split(/\r\n|\r|\n/g);

        // Changes should be in the format of [<category>] <change content>
        const lineRegEx = /\[(?<category>[A-Z]+)\]\s*(?<content>[\w|\W]*)/;
        const changes = lines.map(line => {
            const lineMatches = line.match(lineRegEx);
            const category = lineMatches ? lineMatches.groups.category.toUpperCase() : 'OTHER';
            const content = lineMatches ? lineMatches.groups.content : '';

            // Each change has meta data about changelog where it came from, category, and content
            return {
                changelog,
                category,
                content,
            };
        });

        all.push(...changes);

        return all;
    }, []);

    // Group similarlly categorized changes
    const uniqueCategories = [...new Set(allChanges.map(change => change.category))].sort();
    uniqueCategories.forEach(category => {
        releaseEntry += `#### ${category}\n\n`;

        // Add each change under the category header
        const categoryChanges = allChanges.filter(change => change.category === category);
        categoryChanges.forEach(change => {
            releaseEntry += `* ${change.content}\n`
        });

        releaseEntry += '\n';
    });

    releaseEntry = releaseEntry.trim();

    // Write the release notes to a file to be used for github release
    fs.writeFileSync(path.resolve(path.join(__dirname, '..', 'RELEASE-NOTES.md')), releaseEntry);

    return releaseEntry;
}

module.exports = {
    createReleaseEntry,
};
