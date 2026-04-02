import { execSync } from 'node:child_process';

const SPEC_FILE = 'ADMIN_VIEW_SPEC.md';
const WATCH_PATHS = [
  'app/',
  'styles/',
  'index.html',
  'vercel.json',
];

function getChangedFiles(baseRef, headRef) {
  const output = execSync(`git diff --name-only ${baseRef}...${headRef}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  if (!output) return [];
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function getWorkingTreeChangedFiles() {
  const staged = execSync('git diff --name-only --cached', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const unstaged = execSync('git diff --name-only', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  return Array.from(
    new Set(
      `${staged}\n${unstaged}`
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );
}

function isWatchedChange(path) {
  return WATCH_PATHS.some((prefix) => path === prefix || path.startsWith(prefix));
}

function run() {
  const baseRef = process.env.SPEC_BASE_REF || 'WORKTREE';
  const headRef = process.env.SPEC_HEAD_REF || 'HEAD';
  const changed = baseRef === 'WORKTREE'
    ? getWorkingTreeChangedFiles()
    : getChangedFiles(baseRef, headRef);

  const watchedChanged = changed.some(isWatchedChange);
  const specChanged = changed.includes(SPEC_FILE);

  if (watchedChanged && !specChanged) {
    console.error('\nAdmin spec sync check failed.');
    console.error(`Code/config changed but ${SPEC_FILE} was not updated.`);
    console.error('Please update the spec before pushing.\n');
    process.exit(1);
  }

  console.log('Admin spec sync check passed.');
}

run();
