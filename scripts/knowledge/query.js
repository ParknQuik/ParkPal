#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_DB_PATH = path.join(
  os.tmpdir(),
  'parkpal-knowledge',
  crypto.createHash('sha1').update(ROOT).digest('hex').slice(0, 12),
  'knowledge.db'
);
const DB_PATH = process.env.KNOWLEDGE_DB_PATH
  ? path.resolve(ROOT, process.env.KNOWLEDGE_DB_PATH)
  : DEFAULT_DB_PATH;

const SCORE_WEIGHTS = {
  sourcePathToken: 1.2,
  headingToken: 2.4,
  summaryToken: 1.8,
  topicToken: 2.0,
  referenceToken: 1.2,
  contentToken: 0.35,
  maxContentTokenMatches: 8,
  priorityAlways: 1.5,
  priorityHigh: 0.8,
  statusCurrent: 0.5,
  statusNeedsVerification: 0.2,
  currentIntentStatusReport: 3.5,
  currentIntentBetaReadiness: 6.0,
  currentIntentRoadmapPenalty: -1.0,
  staleStatusPenalty: -3.0,
  staleChunkPenalty: -2.0,
  historicalIntentBoost: 1.2
};

function parseArgs(argv) {
  const options = {
    limit: 5,
    status: null,
    subsystem: null,
    json: false,
    selfTest: false,
    queryParts: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--limit') {
      options.limit = Number(argv[++index]);
    } else if (arg === '--status') {
      options.status = argv[++index];
    } else if (arg === '--subsystem') {
      options.subsystem = argv[++index];
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--self-test') {
      options.selfTest = true;
    } else {
      options.queryParts.push(arg);
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error('--limit must be a positive integer');
  }

  return options;
}

function toFtsQuery(query) {
  const tokens = query
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9_.-]*/g);

  if (!tokens || tokens.length === 0) {
    throw new Error('Provide a non-empty search query');
  }

  return tokens.map((token) => `"${token.replace(/"/g, '""')}"`).join(' OR ');
}

function tokenize(query) {
  return query.toLowerCase().match(/[a-z0-9][a-z0-9_.-]*/g) || [];
}

function countMatches(value, token) {
  const matches = String(value || '').toLowerCase().match(new RegExp(`\\b${escapeRegex(token)}`, 'g'));
  return matches ? matches.length : 0;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getShortSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8'
    }).trim();
  } catch {
    return 'unknown';
  }
}

function getSourceMetadata(sourcePath) {
  const absolutePath = path.join(ROOT, sourcePath);
  if (!fs.existsSync(absolutePath)) return null;

  const content = fs.readFileSync(absolutePath, 'utf8');
  const stat = fs.statSync(absolutePath);
  return {
    sourceHash: crypto.createHash('sha256').update(content).digest('hex'),
    sourceMtimeMs: Math.trunc(stat.mtimeMs)
  };
}

function asksForHistory(query) {
  return /\b(history|historical|completed|previously|past|superseded)\b/i.test(query);
}

function hasCurrentIntent(query) {
  return /\b(continue|next|roadmap|current|gaps?|blockers?|status|today|now)\b/i.test(query);
}

function calculateScore(row, query) {
  const tokens = tokenize(query);
  const heading = row.headingPath.join(' ');
  const topics = row.topics.join(' ');
  const references = row.references.join(' ');
  const wantsHistory = asksForHistory(query);
  const currentIntent = hasCurrentIntent(query);
  let score = 0;

  for (const token of tokens) {
    score += countMatches(row.sourcePath, token) * SCORE_WEIGHTS.sourcePathToken;
    score += countMatches(heading, token) * SCORE_WEIGHTS.headingToken;
    score += countMatches(row.summary, token) * SCORE_WEIGHTS.summaryToken;
    score += countMatches(topics, token) * SCORE_WEIGHTS.topicToken;
    score += countMatches(references, token) * SCORE_WEIGHTS.referenceToken;
    score += Math.min(countMatches(row.content, token), SCORE_WEIGHTS.maxContentTokenMatches) * SCORE_WEIGHTS.contentToken;
  }

  if (row.priority === 'always') score += SCORE_WEIGHTS.priorityAlways;
  if (row.priority === 'high') score += SCORE_WEIGHTS.priorityHigh;
  if (row.knowledgeStatus === 'current') score += SCORE_WEIGHTS.statusCurrent;
  if (row.knowledgeStatus === 'needs-verification') score += SCORE_WEIGHTS.statusNeedsVerification;
  if (currentIntent && row.sourcePath === 'STATUS_REPORT.md') score += SCORE_WEIGHTS.currentIntentStatusReport;
  if (currentIntent && row.sourcePath === 'docs/BETA_READINESS_CHECKLIST.md') score += SCORE_WEIGHTS.currentIntentBetaReadiness;
  if (currentIntent && !wantsHistory && row.sourcePath === 'ROADMAP.md') score += SCORE_WEIGHTS.currentIntentRoadmapPenalty;
  if (!wantsHistory && ['historical', 'deprecated'].includes(row.knowledgeStatus)) score += SCORE_WEIGHTS.staleStatusPenalty;
  if (!wantsHistory && row.isStale) score += SCORE_WEIGHTS.staleChunkPenalty;
  if (wantsHistory && ['historical', 'deprecated'].includes(row.knowledgeStatus)) score += SCORE_WEIGHTS.historicalIntentBoost;

  return Number(score.toFixed(2));
}

function parseJsonArray(value) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function openDatabase(dbPath = DB_PATH, immutable = true) {
  if (!fs.existsSync(dbPath)) {
    throw new Error('Knowledge database not found. Run `npm run knowledge:build` first.');
  }
  return new DatabaseSync(immutable ? `${pathToFileURL(dbPath).href}?immutable=1` : dbPath);
}

function collectWarnings(db) {
  const warnings = [];
  const currentHeadCommit = getShortSha();
  const indexedCommits = db.prepare(`
    SELECT DISTINCT indexHeadCommit
    FROM chunks
    WHERE indexHeadCommit IS NOT NULL
  `).all().map((row) => row.indexHeadCommit);

  for (const indexHeadCommit of indexedCommits) {
    if (indexHeadCommit && currentHeadCommit !== 'unknown' && indexHeadCommit !== currentHeadCommit) {
      warnings.push({
        type: 'head-changed',
        message: `Knowledge DB was built at ${indexHeadCommit}; current HEAD is ${currentHeadCommit}. Rebuild with npm run knowledge:build.`
      });
    }
  }

  const sources = db.prepare(`
    SELECT sourcePath, sourceHash, sourceMtimeMs
    FROM chunks
    GROUP BY sourcePath, sourceHash, sourceMtimeMs
    ORDER BY sourcePath
  `).all();

  for (const source of sources) {
    const current = getSourceMetadata(source.sourcePath);
    if (!current) {
      warnings.push({
        type: 'source-missing',
        sourcePath: source.sourcePath,
        message: `${source.sourcePath} no longer exists. Rebuild after reconciling sources.json.`
      });
      continue;
    }

    if (current.sourceHash !== source.sourceHash || current.sourceMtimeMs !== source.sourceMtimeMs) {
      warnings.push({
        type: 'source-changed',
        sourcePath: source.sourcePath,
        message: `${source.sourcePath} changed since the knowledge DB was built. Rebuild with npm run knowledge:build.`
      });
    }
  }

  return warnings;
}

function queryIndex(db, query, options = {}) {
  const limit = options.limit || 5;
  const params = [toFtsQuery(query)];
  let filters = '';

  if (options.status) {
    filters += ' AND chunks.knowledgeStatus = ?';
    params.push(options.status);
  }

  if (options.subsystem) {
    filters += ' AND chunks.subsystem = ?';
    params.push(options.subsystem);
  }

  params.push(1000);

  const rows = db.prepare(`
    SELECT
      chunks.id,
      chunks.sourcePath,
      chunks.headingPath,
      chunks.subsystem,
      chunks.topics,
      chunks.knowledgeStatus,
      chunks.priority,
      chunks.summary,
      chunks.sourceReferences,
      chunks.content,
      chunks.startLine,
      chunks.endLine,
      chunks.lastIndexedCommit,
      chunks.lastIndexedAt,
      chunks.indexHeadCommit,
      chunks.sourceHash,
      chunks.sourceMtimeMs,
      chunks.staleReason,
      chunks.detectedDate,
      chunks.isStale,
      bm25(chunks_fts, 1.4, 1.6, 1.1, 0.8, 1.0) AS rank
    FROM chunks_fts
    JOIN chunks ON chunks.rowid = chunks_fts.rowid
    WHERE chunks_fts MATCH ?${filters}
    ORDER BY rank ASC
    LIMIT ?
  `).all(...params);

  const sortedRows = rows
    .map((row) => {
      const result = {
        ...row,
        headingPath: parseJsonArray(row.headingPath),
        topics: parseJsonArray(row.topics),
        references: parseJsonArray(row.sourceReferences),
        isStale: Boolean(row.isStale)
      };
      result.score = calculateScore(result, query);
      delete result.content;
      delete result.sourceReferences;
      delete result.rank;
      return result;
    })
    .sort((a, b) => b.score - a.score || a.sourcePath.localeCompare(b.sourcePath));

  if (options.status || options.subsystem) {
    return sortedRows.slice(0, limit);
  }

  const sourceCounts = new Map();
  const diversified = [];

  function addRow(row) {
    if (!row || diversified.includes(row)) return false;
    const count = sourceCounts.get(row.sourcePath) || 0;
    if (count >= 2) return false;
    sourceCounts.set(row.sourcePath, count + 1);
    diversified.push(row);
    return true;
  }

  addRow(sortedRows[0]);
  if (diversified.length === limit) return diversified;
  const strongAlwaysThreshold = (sortedRows[0]?.score || 0) * 0.75;
  for (const row of sortedRows) {
    if (row.priority === 'always' && !sourceCounts.has(row.sourcePath) && row.score >= strongAlwaysThreshold) {
      addRow(row);
      if (diversified.length === limit) return diversified;
    }
  }

  if (!diversified.some((row) => row.knowledgeStatus === 'needs-verification')) {
    const needsVerification = sortedRows.find((row) => row.knowledgeStatus === 'needs-verification');
    if (needsVerification) {
      addRow(needsVerification);
      if (diversified.length === limit) return diversified;
    }
  }

  for (const row of sortedRows) {
    addRow(row);
    if (diversified.length === limit) return diversified;
  }

  for (const row of sortedRows) {
    if (diversified.includes(row)) continue;
    diversified.push(row);
    if (diversified.length === limit) break;
  }

  return diversified;
}

function formatWarnings(warnings) {
  if (!warnings.length) return [];

  return [
    'Freshness warnings:',
    ...warnings.map((warning) => `- ${warning.message}`),
    ''
  ];
}

function formatResults(query, rows, warnings = []) {
  const lines = [`Query: ${query}`, ''];
  lines.push(...formatWarnings(warnings));

  if (rows.length === 0) {
    lines.push('No matching knowledge chunks found.');
    return lines.join('\n');
  }

  rows.forEach((row, index) => {
    const heading = row.headingPath.length > 0 ? row.headingPath.join(' > ') : 'Preamble';
    lines.push(`${index + 1}. ${row.sourcePath} > ${heading}`);
    lines.push(`   status: ${row.knowledgeStatus} | subsystem: ${row.subsystem} | score: ${row.score}`);
    if (row.isStale || row.detectedDate) {
      const staleLabel = row.isStale ? ' | stale: yes' : '';
      lines.push(`   freshness: detectedDate=${row.detectedDate || 'none'}${staleLabel}`);
    }
    if (row.staleReason) {
      lines.push(`   staleReason: ${row.staleReason}`);
    }
    lines.push(`   summary: ${row.summary}`);
    lines.push(`   source: ${row.sourcePath}:${row.startLine}-${row.endLine}`);
    lines.push('');
  });

  const suggestedReads = Array.from(
    new Set(rows.flatMap((row) => row.references).filter(Boolean))
  ).slice(0, 8);

  if (suggestedReads.length > 0) {
    lines.push('Suggested next reads:');
    suggestedReads.forEach((reference) => lines.push(`- ${reference}`));
  }

  return lines.join('\n').trimEnd();
}

function withTempKnowledgeDb(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parkpal-knowledge-'));
  const tempDbPath = path.join(tempDir, 'knowledge.db');
  const env = {
    ...process.env,
    KNOWLEDGE_DB_PATH: tempDbPath
  };

  try {
    execFileSync(process.execPath, ['--no-warnings', path.join(__dirname, 'build-index.js')], {
      cwd: ROOT,
      env,
      stdio: 'pipe'
    });
    callback(tempDbPath, env);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runJsonQuery(query, env, limit = 8) {
  const output = execFileSync(
    process.execPath,
    ['--no-warnings', __filename, query, '--json', '--limit', String(limit)],
    {
      cwd: ROOT,
      env,
      encoding: 'utf8'
    }
  );
  return JSON.parse(output);
}

function corruptSourceHash(dbPath) {
  const db = openDatabase(dbPath, false);
  try {
    const source = db.prepare('SELECT sourcePath FROM chunks ORDER BY sourcePath LIMIT 1').get();
    if (!source) throw new Error('Self-test could not find a source to corrupt.');
    db.prepare('UPDATE chunks SET sourceHash = ? WHERE sourcePath = ?').run(
      'corrupted-source-hash',
      source.sourcePath
    );
  } finally {
    db.close();
  }
}

function corruptHeadCommit(dbPath) {
  const db = openDatabase(dbPath, false);
  try {
    db.prepare('UPDATE chunks SET indexHeadCommit = ?').run('corrupted-head');
  } finally {
    db.close();
  }
}

function assertWarningTypes(payload, expectedTypes, label) {
  const warningTypes = new Set((payload.warnings || []).map((warning) => warning.type));
  for (const expectedType of expectedTypes) {
    if (!warningTypes.has(expectedType)) {
      throw new Error(`Self-test expected ${expectedType} warning for ${label}`);
    }
  }
}

function assertFreshnessWarnings() {
  withTempKnowledgeDb((tempDbPath, env) => {
    const freshPayload = runJsonQuery('current project status', env);
    if (freshPayload.warnings.length !== 0) {
      throw new Error('Self-test expected fresh temp DB warnings to be empty.');
    }

    corruptSourceHash(tempDbPath);
    const sourceChangedPayload = runJsonQuery('current project status', env);
    assertWarningTypes(sourceChangedPayload, ['source-changed'], 'corrupted source hash');
  });

  withTempKnowledgeDb((tempDbPath, env) => {
    corruptHeadCommit(tempDbPath);
    const headChangedPayload = runJsonQuery('current project status', env);
    assertWarningTypes(headChangedPayload, ['head-changed'], 'corrupted HEAD metadata');
  });
}

function runContextOutput(query, env, limit = 3) {
  return execFileSync(
    process.execPath,
    ['--no-warnings', path.join(__dirname, 'context.js'), query, '--limit', String(limit)],
    {
      cwd: ROOT,
      env,
      encoding: 'utf8'
    }
  );
}

function assertContextOutput() {
  withTempKnowledgeDb((_tempDbPath, env) => {
    const output = runContextOutput('current project status', env);
    if (!output.includes('ParkPal Lean Knowledge Context')) {
      throw new Error('Self-test expected context output header.');
    }
    if (!output.includes('Branch:') || !output.includes('HEAD:')) {
      throw new Error('Self-test expected context output to include Branch and HEAD.');
    }
    if (!/STATUS_REPORT\.md:\d+-\d+/.test(output)) {
      throw new Error('Self-test expected context output to include cited STATUS_REPORT.md line range.');
    }
    if (output.includes('Suggested next reads:')) {
      throw new Error('Self-test expected context output to omit broad suggested reads.');
    }
    if (!output.includes('read no more than the cited line ranges')) {
      throw new Error('Self-test expected context output to include bounded-read instruction.');
    }
  });
}

function runQueryChecks(db) {
  const checks = [
    {
      query: 'current project status',
      expectedPaths: ['STATUS_REPORT.md']
    },
    {
      query: 'mobile header dark mode',
      expectedAny: ['frontend/mobile/TESTING.md', 'STATUS_REPORT.md', 'docs/PARKPAL_SYSTEM_ARCHITECTURE.md']
    },
    {
      query: 'deployment status',
      expectedStatus: 'needs-verification'
    },
    {
      query: 'continue roadmap next steps current gaps blockers',
      expectedOrderedPaths: ['STATUS_REPORT.md', 'docs/BETA_READINESS_CHECKLIST.md'],
      expectedBeforeHistoricalSource: 'ROADMAP.md',
      rejectedFirstPath: 'ROADMAP.md'
    },
    {
      query: 'ROADMAP February April launch next steps',
      expectedPathStatus: {
        sourcePath: 'ROADMAP.md',
        statuses: ['historical']
      }
    },
    {
      query: 'post merge status report dev current gaps blockers',
      expectedReferences: [
        'src/screens/MyBookingsScreen.tsx'
      ],
      rejectedReferences: [
        '.agents/knowledge/sources.js',
        'src/screens/MyBookingsScreen.ts'
      ]
    },
    {
      query: 'knowledge sources json',
      expectedReferences: [
        '.agents/knowledge/sources.json'
      ],
      rejectedReferences: [
        '.agents/knowledge/sources.js'
      ]
    }
  ];

  for (const check of checks) {
    const rows = queryIndex(db, check.query, { limit: 8 });
    if (rows.length === 0) {
      throw new Error(`Self-test query returned no rows: ${check.query}`);
    }

    if (check.expectedPaths) {
      for (const expectedPath of check.expectedPaths) {
        if (!rows.some((row) => row.sourcePath === expectedPath)) {
          throw new Error(`Self-test expected ${expectedPath} for query: ${check.query}`);
        }
      }
    }

    if (check.expectedAny && !rows.some((row) => check.expectedAny.includes(row.sourcePath))) {
      throw new Error(`Self-test expected one of ${check.expectedAny.join(', ')} for query: ${check.query}`);
    }

    if (check.expectedStatus && !rows.some((row) => row.knowledgeStatus === check.expectedStatus)) {
      throw new Error(`Self-test expected status ${check.expectedStatus} for query: ${check.query}`);
    }

    if (check.expectedOrderedPaths) {
      let previousIndex = -1;
      let previousPath = null;
      for (const expectedPath of check.expectedOrderedPaths) {
        const foundIndex = rows.findIndex((row) => row.sourcePath === expectedPath);
        if (foundIndex === -1) {
          throw new Error(`Self-test expected ordered result ${expectedPath} for query: ${check.query}`);
        }
        if (foundIndex <= previousIndex) {
          throw new Error(`Self-test expected ${expectedPath} after ${previousPath} for query: ${check.query}`);
        }
        previousIndex = foundIndex;
        previousPath = expectedPath;
      }

      if (check.expectedBeforeHistoricalSource) {
        const firstHistoricalIndex = rows.findIndex((row) => (
          row.sourcePath === check.expectedBeforeHistoricalSource &&
          (row.knowledgeStatus === 'historical' || row.isStale)
        ));
        if (firstHistoricalIndex !== -1 && firstHistoricalIndex <= previousIndex) {
          throw new Error(
            `Self-test expected ${check.expectedOrderedPaths.join(' and ')} before stale ` +
            `${check.expectedBeforeHistoricalSource} chunks for query: ${check.query}`
          );
        }
      }
    }

    if (check.expectedFirstPath && rows[0].sourcePath !== check.expectedFirstPath) {
      throw new Error(`Self-test expected first result ${check.expectedFirstPath} for query: ${check.query}`);
    }

    if (check.rejectedFirstPath && rows[0].sourcePath === check.rejectedFirstPath) {
      throw new Error(`Self-test found rejected first result ${check.rejectedFirstPath} for query: ${check.query}`);
    }

    if (check.expectedPathStatus) {
      const matchingRows = rows.filter((row) => row.sourcePath === check.expectedPathStatus.sourcePath);
      if (matchingRows.length === 0) {
        throw new Error(`Self-test expected source ${check.expectedPathStatus.sourcePath} for query: ${check.query}`);
      }

      if (!matchingRows.some((row) => check.expectedPathStatus.statuses.includes(row.knowledgeStatus) || row.isStale)) {
        throw new Error(
          `Self-test expected stale or ${check.expectedPathStatus.statuses.join('/')} ` +
          `${check.expectedPathStatus.sourcePath} chunk for query: ${check.query}`
        );
      }
    }

    const references = rows.flatMap((row) => row.references);
    if (check.expectedReferences) {
      for (const expectedReference of check.expectedReferences) {
        if (!references.includes(expectedReference)) {
          throw new Error(`Self-test expected reference ${expectedReference} for query: ${check.query}`);
        }
      }
    }

    if (check.rejectedReferences) {
      for (const rejectedReference of check.rejectedReferences) {
        if (references.includes(rejectedReference)) {
          throw new Error(`Self-test found truncated reference ${rejectedReference} for query: ${check.query}`);
        }
      }
    }
  }
}

function runSelfTest() {
  assertFreshnessWarnings();
  assertContextOutput();

  withTempKnowledgeDb((tempDbPath) => {
    const db = openDatabase(tempDbPath);
    try {
      runQueryChecks(db);
    } finally {
      db.close();
    }

    console.log('Knowledge index self-test passed.');
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.selfTest) {
    runSelfTest();
    return;
  }

  const query = options.queryParts.join(' ').trim();
  if (!query) {
    throw new Error('Usage: npm run knowledge:query -- "search terms" [--limit 10] [--status current] [--subsystem mobile] [--json]');
  }

  const db = openDatabase();
  try {
    const rows = queryIndex(db, query, options);
    const warnings = collectWarnings(db);
    if (options.json) {
      console.log(JSON.stringify({ query, warnings, results: rows }, null, 2));
      return;
    }

    console.log(formatResults(query, rows, warnings));
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  collectWarnings,
  formatWarnings,
  openDatabase,
  queryIndex
};
