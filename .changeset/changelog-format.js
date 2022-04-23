// Create a bulleted list of changes with commit link at end of line
const getReleaseLine = async (changeset, type, changelogOptions) => {
    const lines = changeset.summary
        // Get each line
        .split('\n')
        // Remove whitespace and add bullet
        .map(line => `- ${line.trimEnd()}`);

    // If there is a commit then add it at the end of the line
    if (changeset.commit) {
        return lines.join(` (${changeset.commit})\n`);
    }

    return lines.join('\n');
};

const getDependencyReleaseLine = async (changesets, dependenciesUpdated, changelogOptions) => {
    if (dependenciesUpdated.length === 0) {
        return '';
    }

    const changesetLinks = changesets.map(
        changeset => `- Updated dependencies${changeset.commit ? ` (${changeset.commit})` : ''}`,
    );

    const updatedDepenenciesList = dependenciesUpdated.map(
        dependency => `  - ${dependency.name}@${dependency.newVersion}`,
    );

    return [...changesetLinks, ...updatedDepenenciesList].join('\n');
};

module.exports = {
    getReleaseLine,
    getDependencyReleaseLine,
};
