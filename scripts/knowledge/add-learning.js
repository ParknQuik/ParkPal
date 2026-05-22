#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const LEARNINGS_PATH = path.join(ROOT, 'docs/agent-knowledge/SESSION_LEARNINGS.md');

function parseArgs(argv) {
  const options = {
    title: '',
    summary: '',
    lessons: [],
    files: [],
    verification: [],
    pr: '',
    bodyParts: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--title') {
      options.title = argv[++index] || '';
    } else if (arg === '--summary') {
      options.summary = argv[++index] || '';
    } else if (arg === '--lesson') {
      options.lessons.push(argv[++index] || '');
    } else if (arg === '--file') {
      options.files.push(argv[++index] || '');
    } else if (arg === '--verification') {
      options.verification.push(argv[++index] || '');
    } else if (arg === '--pr') {
      options.pr = argv[++index] || '';
    } else {
      options.bodyParts.push(arg);
    }
  }

  options.title = options.title.trim();
  options.summary = options.summary.trim() || options.bodyParts.join(' ').trim();
  options.lessons = options.lessons.map((value) => value.trim()).filter(Boolean);
  options.files = options.files.map((value) => value.trim()).filter(Boolean);
  options.verification = options.verification.map((value) => value.trim()).filter(Boolean);
  options.pr = options.pr.trim();

  if (!options.title) {
    throw new Error('Usage: npm run knowledge:add-learning -- --title "Title" [--summary "..."] [--lesson "..."] [--file path] [--verification "..."] [--pr "#123"]');
  }

  return options;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatBlock(options) {
  const lines = [
    '',
    `## ${todayIsoDate()} - ${options.title}`,
    ''
  ];

  if (options.pr) {
    lines.push(`- PR/session: ${options.pr}`);
  }

  if (options.summary) {
    lines.push(`- Summary: ${options.summary}`);
  }

  if (options.lessons.length > 0) {
    lines.push('- Lessons:');
    options.lessons.forEach((lesson) => lines.push(`  - ${lesson}`));
  }

  if (options.files.length > 0) {
    lines.push('- Relevant files:');
    options.files.forEach((filePath) => lines.push(`  - \`${filePath}\``));
  }

  if (options.verification.length > 0) {
    lines.push('- Verification:');
    options.verification.forEach((command) => lines.push(`  - \`${command}\``));
  }

  if (!options.summary && options.lessons.length === 0 && options.files.length === 0 && options.verification.length === 0) {
    lines.push('- Summary: Curated session learning. Add concrete lessons, files, and verification before relying on this entry for routing.');
  }

  lines.push('');
  return lines.join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  fs.mkdirSync(path.dirname(LEARNINGS_PATH), { recursive: true });
  fs.appendFileSync(LEARNINGS_PATH, formatBlock(options), 'utf8');
  console.log(`Appended learning to ${path.relative(ROOT, LEARNINGS_PATH)}.`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
