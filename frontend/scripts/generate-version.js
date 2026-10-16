const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFilePath = path.join(__dirname, '../src/version.json');
const pkgPath = path.join(__dirname, '../package.json');

let version = '1.1.0';
let commitHash = 'unknown';

// Try reading package.json version as base
try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) {
        version = pkg.version;
    }
} catch (e) {}

// Try getting latest git tag
try {
    const gitTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (gitTag) {
        version = gitTag.replace(/^v/, '');
    }
} catch (e) {}

// Try getting git commit hash
try {
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (gitHash) {
        commitHash = gitHash;
    }
} catch (e) {}

// Fallback to existing version.json if git commands fail (e.g. inside Docker)
if (commitHash === 'unknown' && fs.existsSync(versionFilePath)) {
    try {
        const existing = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
        commitHash = existing.commitHash || commitHash;
        if (!version || version === '1.0.0') {
            version = existing.version || version;
        }
    } catch (e) {}
}

const data = {
    version,
    commitHash
};

fs.writeFileSync(versionFilePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`[generate-version] Updated version.json: version ${version}, commit ${commitHash}`);
