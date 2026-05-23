#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { collectWarnings, formatWarnings, openDatabase, queryIndex } = require('./query');

const COMPACT_SOURCE_PREFIX = '.agents/knowledge/compact/';

function parseArgs(argv) {
  const options = {
    limit: 3,
    compact: true,
    queryParts: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--limit') {
      options.limit = Number(argv[++index]);
    } else if (arg === '--compact') {
      options.compact = true;
    } else if (arg === '--verbose') {
      options.compact = false;
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

function citationPath(row) {
  return row.citationPath || row.sourcePath;
}

function citationStart(row) {
  return row.citationStartLine || row.startLine;
}

function citationEnd(row) {
  return row.citationEndLine || row.endLine;
}

function formatCompactContext(query, rows, warnings) {
  const branch = gitValue(['branch', '--show-current'], 'detached HEAD');
  const head = gitValue(['log', '-1', '--oneline', '--decorate']);
  const lines = [
    'ParkPal Compact Context',
    `intent=${query}`,
    `git=${branch} | ${head}`
  ];

  if (warnings.length > 0) {
    lines.push('warning=rebuild knowledge DB before planning; HEAD or indexed sources changed');
    lines.push(...formatWarnings(warnings).filter(Boolean));
  }

  if (rows.length === 0) {
    lines.push('no matching knowledge records');
  } else {
    rows.forEach((row, index) => {
      const parts = [
        `${index + 1}. ${citationPath(row)}:${citationStart(row)}-${citationEnd(row)}`,
        `st=${row.knowledgeStatus}`,
        `sys=${row.subsystem}`,
        `score=${row.score}`,
        row.compactDate ? `d=${row.compactDate}` : null,
        row.isStale ? 'stale=yes' : null,
        `txt=${row.compactText || row.summary}`
      ].filter(Boolean);
      lines.push(parts.join(' '));
    });
  }

  lines.push('instruction=startup: verify git only; task follow-up: read cited ranges if needed, then verify live status before claims');
  return lines.join('\n').trimEnd();
}

function formatVerboseContext(query, rows, warnings) {
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
      lines.push(`${index + 1}. ${citationPath(row)}:${citationStart(row)}-${citationEnd(row)}`);
      lines.push(`   heading: ${heading}`);
      if (row.sourcePath !== citationPath(row)) {
        lines.push(`   record: ${row.sourcePath}:${row.startLine}-${row.endLine}`);
      }
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

function formatContext(query, rows, warnings, options = {}) {
  if (options.compact === false) {
    return formatVerboseContext(query, rows, warnings);
  }
  return formatCompactContext(query, rows, warnings);
}

function preferCompactRows(rows, limit) {
  const compactRows = rows.filter((row) => row.sourcePath.startsWith(COMPACT_SOURCE_PREFIX));
  const selected = compactRows.slice(0, limit);

  for (const row of rows) {
    if (selected.length >= limit) break;
    if (!selected.includes(row)) selected.push(row);
  }

  return selected;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const query = options.queryParts.join(' ').trim();
  if (!query) {
    throw new Error('Usage: npm run knowledge:context -- "intent" [--limit 3]');
  }

  const db = openDatabase();
  try {
    const candidateRows = queryIndex(db, query, { limit: Math.max(options.limit * 5, options.limit) });
    const rows = options.compact
      ? preferCompactRows(candidateRows, options.limit)
      : candidateRows.slice(0, options.limit);
    const warnings = collectWarnings(db);
    console.log(formatContext(query, rows, warnings, options));
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
