#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { collectWarnings, formatWarnings, openDatabase, queryIndex } = require('./query');

function parseArgs(argv) {
  const options = {
    limit: 3,
    queryParts: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--limit') {
      options.limit = Number(argv[++index]);
    } else {
      options.queryParts.push(arg);
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error('--limit must be a positive integer');
  }

  return options;
}

function gitValue(args, fallback = 'unknown') {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function formatContext(query, rows, warnings) {
  const branch = gitValue(['branch', '--show-current'], 'detached HEAD');
  const head = gitValue(['log', '-1', '--oneline', '--decorate']);
  const lines = [
    'ParkPal Lean Knowledge Context',
    `Intent: ${query}`,
    `Branch: ${branch}`,
    `HEAD: ${head}`,
    ''
  ];

  if (warnings.length > 0) {
    lines.push('First action: rebuild the knowledge DB before planning from these results because HEAD or indexed sources changed.');
    lines.push('');
  }

  lines.push(...formatWarnings(warnings));

  if (rows.length === 0) {
    lines.push('No matching knowledge chunks found.');
  } else {
    lines.push(`Top ${rows.length} cited knowledge results:`);
    rows.forEach((row, index) => {
      const heading = row.headingPath.length > 0 ? row.headingPath.join(' > ') : 'Preamble';
      lines.push(`${index + 1}. ${row.sourcePath}:${row.startLine}-${row.endLine}`);
      lines.push(`   heading: ${heading}`);
      lines.push(`   status: ${row.knowledgeStatus} | subsystem: ${row.subsystem} | score: ${row.score}`);
      if (row.isStale || row.detectedDate) {
        const staleLabel = row.isStale ? ' | stale: yes' : '';
        lines.push(`   freshness: detectedDate=${row.detectedDate || 'none'}${staleLabel}`);
      }
      if (row.staleReason) {
        lines.push(`   staleReason: ${row.staleReason}`);
      }
      lines.push(`   summary: ${row.summary}`);
    });
  }

  lines.push('');
  lines.push('Agent instruction: read no more than the cited line ranges above unless the task genuinely requires deeper implementation detail. Verify Branch/HEAD with git status before making current-state claims. Use npm run knowledge:query for deeper investigation.');

  return lines.join('\n').trimEnd();
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const query = options.queryParts.join(' ').trim();
  if (!query) {
    throw new Error('Usage: npm run knowledge:context -- "intent" [--limit 3]');
  }

  const db = openDatabase();
  try {
    const rows = queryIndex(db, query, { limit: options.limit });
    const warnings = collectWarnings(db);
    console.log(formatContext(query, rows, warnings));
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  formatContext
};
