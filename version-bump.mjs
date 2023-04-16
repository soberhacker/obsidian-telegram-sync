import { ReleasePR } from 'release-please';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

let packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const packageName = packageJson.name;
const repoUrl = process.env.npm_package_repository_url;
const repoUrlParts = /https:\/\/github.com\/([^/]+)\/([^/.]+)/.exec(repoUrl);
const owner = packageJson.author;
const repo = repoUrlParts[2];

const commits = execSync('git log --pretty=format:%s').toString().split('\n');
const releasePR = new ReleasePR({ owner, repo, packageName, commits });

const changelogEntry = await releasePR.generateChangelogEntry();
const newVersion = changelogEntry.version;
console.log(`New version: ${newVersion}`);

// Update CHANGELOG.md
const changelogPath = 'CHANGELOG.md';
const changelogContent = readFileSync(changelogPath, 'utf8');
const newChangelogContent = changelogEntry.changelogEntry + '\n\n' + changelogContent;
writeFileSync(changelogPath, newChangelogContent);

// Update package.json
packageJson.version = newVersion;
writeFileSync('package.json', JSON.stringify(packageJson, null, '  '));

// Update manifest.json and versions.json
let manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const { minAppVersion } = manifest;
manifest.version = newVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'));

let versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[newVersion] = minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, '\t'));

// Commit changes and create a tag
execSync(`git add CHANGELOG.md package.json manifest.json versions.json`);
execSync(`git commit -m "Release: ${newVersion}"`);
execSync(`git tag v${newVersion}`);
console.log(`Committed and tagged as v${newVersion}`);