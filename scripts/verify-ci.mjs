import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;

function collectJavaScriptFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name))
        .flatMap(entry => {
            const absolutePath = path.join(directory, entry.name);
            if (entry.isDirectory()) return collectJavaScriptFiles(absolutePath);
            return entry.isFile() && /\.(?:js|mjs)$/i.test(entry.name) ? [absolutePath] : [];
        });
}

function run(command, args, label) {
    process.stdout.write(`\n▶ ${label}\n`);
    const result = spawnSync(command, args, {
        cwd: projectRoot,
        env: process.env,
        stdio: 'inherit',
        shell: false
    });
    if (result.error) {
        console.error(`Failed to start ${label}: ${result.error.message}`);
        process.exit(1);
    }
    if (result.status !== 0) {
        console.error(`${label} failed with exit code ${result.status}.`);
        process.exit(result.status || 1);
    }
}

const syntaxFiles = [
    ...collectJavaScriptFiles(path.join(projectRoot, 'src')),
    ...collectJavaScriptFiles(path.join(projectRoot, 'scripts')),
    path.join(projectRoot, 'server.js')
];

for (const filePath of syntaxFiles) {
    run(nodeCommand, ['--check', filePath], `syntax check: ${path.relative(projectRoot, filePath)}`);
}

const npmSteps = [
    ['run', 'schema:verify'],
    ['run', 'panels:validate'],
    ['run', 'routes:inventory'],
    ['run', 'flows:simulate'],
    ['run', 'security:check'],
    ['audit', '--omit=dev']
];

for (const args of npmSteps) run(npmCommand, args, `npm ${args.join(' ')}`);
console.log('\n✓ Cross-platform CI verification completed successfully.');
