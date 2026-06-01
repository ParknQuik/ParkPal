#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { collectWarnings, openDatabase, queryIndex } = require('./query');

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_MAP_PATH = '.agents/knowledge/source-map.json';
const REGRESSION_PATH = 'scripts/knowledge/regression.js';
const DEFAULT_LIMIT = 8;
const STARTUP_LIMIT = 1;
const TASK_CONTEXT_LIMIT = 3;
const BROAD_DOC_PATHS = new Set([
  'STATUS_REPORT.md',
  'ROADMAP.md',
  'DOCUMENTATION.md',
  'docs/BETA_READINESS_CHECKLIST.md',
  '.agents/knowledge/compact/status.jsonl',
  '.agents/knowledge/compact/workflow.jsonl',
  '.agents/knowledge/compact/roadmap.jsonl'
]);
const HIGH_RISK_TERMS = [
  'auth',
  'booking',
  'payment',
  'marketplace',
  'listing',
  'photo',
  'validator',
  '400',
  '401',
  '403',
  '500'
];
const SCAN_DIRS = [
  'backend/routes',
  'backend/controllers',
  'backend/validators',
  'backend/tests',
  'frontend/mobile/src/screens',
  'frontend/mobile/src/store/slices',
  'frontend/mobile/src/services',
  'frontend/mobile/src/__tests__',
  'frontend/mobile/src/store/slices/__tests__'
];

function parseArgs(argv) {
  const options = {
    json: false,
    limit: DEFAULT_LIMIT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--limit') {
      options.limit = Number(argv[++index]);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error('--limit must be a positive integer');
  }

  return options;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function repoFileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function walkFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDir, entry.name);
    const relativePath = path.relative(ROOT, absolutePath).replaceAll(path.sep, '/');
    if (entry.isDirectory()) {
      files.push(...walkFiles(relativePath));
    } else if (entry.isFile() && /\.(?:js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

function fileStem(relativePath) {
  return path.basename(relativePath).replace(/\.(?:test|spec)?\.(?:js|jsx|ts|tsx)$/, '').replace(/\.(?:js|jsx|ts|tsx)$/, '');
}

function splitIdentifier(value) {
  return Array.from(new Set(
    String(value)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_./:-]+/g, ' ')
      .toLowerCase()
      .match(/[a-z0-9]+/g) || []
  ));
}

function displayIdentifier(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_./:-]+/g, ' ')
    .trim();
}

function collectStatusTerms(content) {
  return Array.from(new Set(content.match(/\b[45]\d{2}\b/g) || [])).slice(0, 3);
}

function collectExports(content) {
  const names = [];
  const patterns = [
    /\bexports\.([A-Za-z][A-Za-z0-9_]*)\b/g,
    /\bexport\s+const\s+([A-Za-z][A-Za-z0-9_]*)\b/g,
    /\bexport\s+function\s+([A-Za-z][A-Za-z0-9_]*)\b/g,
    /\bconst\s+([A-Za-z][A-Za-z0-9_]*(?:Schema|Slice|API|Api|Service)?)\s*=/g
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(content);
    while (match) {
      names.push(match[1]);
      match = pattern.exec(content);
    }
  }

  return Array.from(new Set(names)).slice(0, 4);
}

function collectRoutes(relativePath, content) {
  if (!relativePath.startsWith('backend/routes/')) return [];
  const routePattern = /\bapp\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  const routes = [];
  let match = routePattern.exec(content);

  while (match) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
    match = routePattern.exec(content);
  }

  return routes;
}

function indexTests(files) {
  const tests = files.filter((file) => /\.(?:test|spec)\.(?:js|jsx|ts|tsx)$/.test(file));
  const byToken = new Map();

  for (const test of tests) {
    for (const token of splitIdentifier(fileStem(test))) {
      const bucket = byToken.get(token) || [];
      bucket.push(test);
      byToken.set(token, bucket);
    }
  }

  return { tests, byToken };
}

function nearbyTests(relativePath, testIndex) {
  const stemTokens = splitIdentifier(fileStem(relativePath));
  const matches = new Set();

  for (const token of stemTokens) {
    for (const test of testIndex.byToken.get(token) || []) {
      matches.add(test);
    }
  }

  const stem = fileStem(relativePath).toLowerCase();
  for (const test of testIndex.tests) {
    const testStem = fileStem(test).toLowerCase();
    if (testStem.includes(stem) || stem.includes(testStem)) {
      matches.add(test);
    }
  }

  return Array.from(matches).sort().slice(0, 3);
}

function loadSourceMap() {
  const sourceMap = readJson(SOURCE_MAP_PATH);
  const entries = sourceMap.entries || [];
  const bySourcePath = new Map();

  for (const entry of entries) {
    for (const sourcePath of entry.sourcePaths || []) {
      const bucket = bySourcePath.get(sourcePath) || [];
      bucket.push(entry);
      bySourcePath.set(sourcePath, bucket);
    }
  }

  return { entries, bySourcePath };
}

function sourceMapQuery(entry) {
  return [
    entry.title,
    ...(entry.routeKeywords || []).slice(0, 5),
    ...(entry.relatedApis || []).slice(0, 2)
  ].filter(Boolean).join(' ');
}

function addCandidate(candidates, candidate) {
  if (!candidate.query.trim()) return;
  const key = `${candidate.type}:${candidate.query}:${candidate.expectedFiles.join('|')}`;
  if (candidates.has(key)) return;
  candidates.set(key, candidate);
}

function buildFileCandidate(relativePath, content, sourceMap, testIndex) {
  const stem = fileStem(relativePath);
  const exports = collectExports(content);
  const statusTerms = collectStatusTerms(content);
  const tests = nearbyTests(relativePath, testIndex);
  const sourceMapEntries = sourceMap.bySourcePath.get(relativePath) || [];
  const expectedFiles = Array.from(new Set([relativePath, ...tests]));
  const queryParts = [
    displayIdentifier(stem),
    ...exports.map(displayIdentifier),
    ...statusTerms,
    ...tests.map((test) => displayIdentifier(fileStem(test)))
  ];

  if (relativePath.startsWith('backend/routes/')) queryParts.unshift('backend route');
  if (relativePath.startsWith('backend/controllers/')) queryParts.unshift('backend controller');
  if (relativePath.startsWith('backend/validators/')) queryParts.unshift('backend validator');
  if (relativePath.startsWith('frontend/mobile/src/screens/')) queryParts.unshift('mobile screen');
  if (relativePath.startsWith('frontend/mobile/src/store/slices/')) queryParts.unshift('mobile slice');
  if (relativePath.startsWith('frontend/mobile/src/services/')) queryParts.unshift('mobile service');
  if (relativePath.includes('/__tests__/') || relativePath.includes('/tests/')) queryParts.unshift('test');

  return {
    type: tests.length > 0 ? 'file-test-linked' : 'file',
    query: compactQuery(queryParts),
    expectedFiles,
    sourceMapEntryIds: sourceMapEntries.map((entry) => entry.id),
    isHighRisk: isHighRisk(relativePath, queryParts),
    origin: relativePath
  };
}

function buildRouteCandidates(relativePath, content, sourceMap, testIndex) {
  return collectRoutes(relativePath, content).map((route) => {
    const stem = fileStem(relativePath);
    const controllerPath = `backend/controllers/${stem}Controller.js`;
    const validatorPath = `backend/validators/${stem}.js`;
    const tests = nearbyTests(relativePath, testIndex);
    const expectedFiles = [relativePath, controllerPath, validatorPath, ...tests].filter(repoFileExists);
    const sourceMapEntryIds = Array.from(new Set(
      expectedFiles.flatMap((file) => (sourceMap.bySourcePath.get(file) || []).map((entry) => entry.id))
    ));
    const pathWords = route.path.split('/').filter(Boolean).join(' ');

    return {
      type: 'backend-route',
      query: compactQuery([route.method, `/api/v1${route.path}`, pathWords, displayIdentifier(stem), ...tests.map((test) => displayIdentifier(fileStem(test)))]),
      expectedFiles,
      sourceMapEntryIds,
      isHighRisk: isHighRisk(relativePath, [route.method, route.path, ...expectedFiles]),
      origin: relativePath
    };
  });
}

function buildSourceMapCandidates(sourceMap) {
  return sourceMap.entries.map((entry) => ({
    type: 'source-map-entry',
    query: compactQuery([sourceMapQuery(entry)]),
    expectedFiles: (entry.sourcePaths || []).filter(repoFileExists),
    sourceMapEntryIds: [entry.id],
    isHighRisk: isHighRisk(entry.id, [entry.title, ...(entry.routeKeywords || [])]),
    origin: `${SOURCE_MAP_PATH}#${entry.id}`
  }));
}

function compactQuery(parts) {
  return Array.from(new Set(
    parts
      .flatMap((part) => String(part || '').split(/\s+/))
      .map((part) => part.trim())
      .filter(Boolean)
  )).slice(0, 18).join(' ');
}

function isHighRisk(origin, parts) {
  const haystack = `${origin} ${parts.join(' ')}`.toLowerCase();
  return HIGH_RISK_TERMS.some((term) => haystack.includes(term));
}

function buildCandidates() {
  const files = Array.from(new Set(SCAN_DIRS.flatMap(walkFiles))).sort();
  const sourceMap = loadSourceMap();
  const testIndex = indexTests(files);
  const candidates = new Map();

  for (const sourceMapCandidate of buildSourceMapCandidates(sourceMap)) {
    addCandidate(candidates, sourceMapCandidate);
  }

  for (const relativePath of files) {
    const content = readText(relativePath);
    addCandidate(candidates, buildFileCandidate(relativePath, content, sourceMap, testIndex));
    for (const routeCandidate of buildRouteCandidates(relativePath, content, sourceMap, testIndex)) {
      addCandidate(candidates, routeCandidate);
    }
  }

  return Array.from(candidates.values()).sort((a, b) => (
    Number(b.isHighRisk) - Number(a.isHighRisk) ||
    a.type.localeCompare(b.type) ||
    a.query.localeCompare(b.query)
  ));
}

function loadRegressionText() {
  return readText(REGRESSION_PATH);
}

function isLockedByRegression(candidate, regressionText) {
  return candidate.expectedFiles.some((file) => regressionText.includes(file)) ||
    candidate.sourceMapEntryIds.some((id) => regressionText.includes(id)) ||
    regressionText.includes(candidate.query);
}

function classifyCandidate(candidate, results, regressionText) {
  const topPaths = results.map((row) => row.sourcePath);
  const matchedReferences = Array.from(new Set(
    results.flatMap((row) => row.references || [])
      .filter((reference) => candidate.expectedFiles.includes(reference))
  ));
  const sourceMapRank = topPaths.findIndex((sourcePath) => sourcePath === SOURCE_MAP_PATH);
  const hasSourceMapResult = sourceMapRank !== -1;
  const expectedSourceMap = candidate.sourceMapEntryIds.length > 0;
  const referenceCoverage = candidate.expectedFiles.length
    ? matchedReferences.length / candidate.expectedFiles.length
    : 1;
  const topBroadRank = topPaths.findIndex((sourcePath) => BROAD_DOC_PATHS.has(sourcePath));
  const broadDocOutranks = expectedSourceMap &&
    hasSourceMapResult &&
    topBroadRank !== -1 &&
    topBroadRank < sourceMapRank;
  const lockedByRegression = isLockedByRegression(candidate, regressionText);

  let classification = 'covered';
  let suggestedFixType = 'none';

  if (!expectedSourceMap) {
    classification = 'missing-source-map';
    suggestedFixType = 'source-map';
  } else if (broadDocOutranks) {
    classification = 'broad-doc-outrank';
    suggestedFixType = 'rejected-first-path-regression';
  } else if (!hasSourceMapResult || referenceCoverage < 1) {
    classification = 'missing-reference';
    suggestedFixType = 'source-map-references';
  } else if (candidate.isHighRisk && !lockedByRegression) {
    classification = 'needs-regression';
    suggestedFixType = 'knowledge-regression';
  }

  return {
    ...candidate,
    class: classification,
    topPaths,
    matchedReferences,
    expectedPathHit: hasSourceMapResult,
    referenceCoverage,
    sourceMapRank: sourceMapRank === -1 ? null : sourceMapRank + 1,
    lockedByRegression,
    suggestedFixType
  };
}

function measurePayload(name, command, payload) {
  const characters = payload.length;
  return {
    name,
    command,
    status: 'measured',
    estimatedTokens: Math.ceil(characters / 4),
    characters,
    bytes: Buffer.byteLength(payload, 'utf8')
  };
}

function measureBudgets() {
  try {
    const intent = 'current project status';
    const startupOutput = runNodeScript('context.js', [intent, '--limit', String(STARTUP_LIMIT)]);
    const followUpOutput = runNodeScript('context.js', [intent, '--limit', String(TASK_CONTEXT_LIMIT)]);
    const queryOutput = runNodeScript('query.js', [intent, '--json', '--limit', String(TASK_CONTEXT_LIMIT * 5)]);
    const compactRecordPayload = buildCompactRecordPayload(queryOutput, TASK_CONTEXT_LIMIT);

    return {
      startup: measurePayload(
        'startup:limit-1',
        `npm run knowledge:context -- "${intent}" --limit ${STARTUP_LIMIT}`,
        startupOutput
      ),
      compactFollowUp: measurePayload(
        'follow-up:compact-context-plus-records',
        `npm run knowledge:context -- "${intent}" --limit ${TASK_CONTEXT_LIMIT} + compact JSONL records`,
        `${followUpOutput}\n\n${compactRecordPayload}`
      )
    };
  } catch (error) {
    return {
      startup: {
        status: 'not measured',
        reason: error.message
      },
      compactFollowUp: {
        status: 'not measured',
        reason: error.message
      }
    };
  }
}

function buildCompactRecordPayload(queryJsonOutput, limit) {
  const payload = JSON.parse(queryJsonOutput);
  const rows = (payload.results || [])
    .filter((row) => row.sourcePath.startsWith('.agents/knowledge/compact/'))
    .slice(0, limit);

  if (rows.length === 0) {
    return 'No compact knowledge records were found in the query output.';
  }

  return rows.map((row) => [
    `--- ${row.sourcePath}:${row.startLine}-${row.endLine} ---`,
    readLineRange(row.sourcePath, row.startLine, row.endLine)
  ].join('\n')).join('\n\n');
}

function readLineRange(relativePath, startLine, endLine) {
  const lines = readText(relativePath).split(/\r?\n/);
  return lines.slice(startLine - 1, endLine).join('\n').trimEnd();
}

function runNodeScript(scriptName, args) {
  return execFileSync(
    process.execPath,
    ['--no-warnings', path.join(__dirname, scriptName), ...args],
    {
      cwd: ROOT,
      encoding: 'utf8'
    }
  ).trimEnd();
}

function summarize(candidates) {
  const gapCounts = {};
  for (const candidate of candidates) {
    gapCounts[candidate.class] = (gapCounts[candidate.class] || 0) + 1;
  }

  const expectedSourceMapCandidates = candidates.filter((candidate) => candidate.sourceMapEntryIds.length > 0);
  const pathHits = expectedSourceMapCandidates.filter((candidate) => candidate.expectedPathHit).length;
  const referenceCoverageValues = expectedSourceMapCandidates.map((candidate) => candidate.referenceCoverage);
  const coveredCount = candidates.filter((candidate) => candidate.class === 'covered').length;

  return {
    totalCandidates: candidates.length,
    coveredCount,
    gapCounts,
    pathHitRate: expectedSourceMapCandidates.length ? pathHits / expectedSourceMapCandidates.length : 0,
    referenceCoverage: referenceCoverageValues.length
      ? referenceCoverageValues.reduce((sum, value) => sum + value, 0) / referenceCoverageValues.length
      : 0
  };
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function rankCandidatesForText(candidates) {
  const rank = {
    'broad-doc-outrank': 0,
    'missing-reference': 1,
    'missing-source-map': 2,
    'needs-regression': 3,
    covered: 4
  };

  return [...candidates].sort((a, b) => (
    (rank[a.class] ?? 9) - (rank[b.class] ?? 9) ||
    Number(b.isHighRisk) - Number(a.isHighRisk) ||
    a.query.localeCompare(b.query)
  ));
}

function formatTextReport(report) {
  const lines = [
    'ParkPal Knowledge Hit-Rate Scan',
    `Candidates: ${report.summary.totalCandidates}`,
    `Covered: ${report.summary.coveredCount}`,
    `Path hit rate: ${formatPercent(report.summary.pathHitRate)}`,
    `Reference coverage: ${formatPercent(report.summary.referenceCoverage)}`,
    '',
    'Gap counts:'
  ];

  for (const [classification, count] of Object.entries(report.summary.gapCounts).sort()) {
    lines.push(`- ${classification}: ${count}`);
  }

  lines.push('', 'Budget samples:');
  lines.push(`- startup: ${formatBudget(report.budgets.startup)}`);
  lines.push(`- compact follow-up: ${formatBudget(report.budgets.compactFollowUp)}`);
  lines.push('', 'Ranked candidates:');

  for (const candidate of rankCandidatesForText(report.candidates).slice(0, 30)) {
    lines.push(`- [${candidate.class}] ${candidate.query}`);
    lines.push(`  expected: ${candidate.expectedFiles.slice(0, 6).join(', ') || 'none'}`);
    lines.push(`  top: ${candidate.topPaths.slice(0, 5).join(', ') || 'none'}`);
    lines.push(`  fix: ${candidate.suggestedFixType}`);
  }

  if (report.candidates.length > 30) {
    lines.push(`- ... ${report.candidates.length - 30} additional candidates hidden; use --json for full output.`);
  }

  if (report.warnings.length > 0) {
    lines.push('', 'Freshness warnings:');
    report.warnings.forEach((warning) => lines.push(`- ${warning.message}`));
  }

  return lines.join('\n');
}

function formatBudget(budget) {
  if (budget.status !== 'measured') return `not measured (${budget.reason})`;
  return `${budget.estimatedTokens} estimated tokens`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const candidates = buildCandidates();
  const regressionText = loadRegressionText();
  const db = openDatabase();

  try {
    const warnings = collectWarnings(db);
    const classified = candidates.map((candidate) => {
      const results = queryIndex(db, candidate.query, { limit: options.limit });
      return classifyCandidate(candidate, results, regressionText);
    });
    const report = {
      summary: summarize(classified),
      candidates: classified.map((candidate) => ({
        query: candidate.query,
        class: candidate.class,
        type: candidate.type,
        origin: candidate.origin,
        expectedFiles: candidate.expectedFiles,
        sourceMapEntryIds: candidate.sourceMapEntryIds,
        topPaths: candidate.topPaths,
        matchedReferences: candidate.matchedReferences,
        suggestedFixType: candidate.suggestedFixType,
        isHighRisk: candidate.isHighRisk,
        lockedByRegression: candidate.lockedByRegression,
        sourceMapRank: candidate.sourceMapRank,
        referenceCoverage: candidate.referenceCoverage
      })),
      budgets: measureBudgets(),
      warnings
    };

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(formatTextReport(report));
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}
