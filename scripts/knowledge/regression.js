#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_BASELINE_REF = 'origin/dev';
const DEFAULT_LIMIT = 8;

const QUERY_SPECS = [
  {
    query: 'cash payment 403 booking modal PaymentScreen',
    group: 'session-aware',
    expectedPaths: [
      '.agents/knowledge/source-map.json',
      'docs/agent-knowledge/SESSION_LEARNINGS.md'
    ],
    expectedAnyPaths: [
      '.agents/knowledge/source-map.json',
      'docs/agent-knowledge/SESSION_LEARNINGS.md'
    ],
    expectedReferences: [
      'frontend/mobile/src/screens/PaymentScreen.tsx',
      'backend/controllers/paymentsController.js'
    ]
  },
  {
    query: 'React hook order useStatusBarStyle QRScannerScreen',
    group: 'session-aware',
    expectedPaths: [
      '.agents/knowledge/source-map.json',
      'docs/agent-knowledge/SESSION_LEARNINGS.md'
    ],
    expectedAnyPaths: [
      '.agents/knowledge/source-map.json',
      'docs/agent-knowledge/SESSION_LEARNINGS.md'
    ],
    expectedReferences: [
      'frontend/mobile/src/screens/QRScannerScreen.tsx',
      'frontend/mobile/src/hooks/useStatusBarStyle.ts'
    ]
  },
  {
    query: 'payment page MaterialCommunityIcons emoji cash',
    group: 'session-aware',
    expectedPaths: [
      '.agents/knowledge/source-map.json',
      'docs/agent-knowledge/SESSION_LEARNINGS.md'
    ],
    expectedAnyPaths: [
      '.agents/knowledge/source-map.json',
      'docs/agent-knowledge/SESSION_LEARNINGS.md'
    ],
    expectedReferences: [
      'frontend/mobile/src/screens/PaymentScreen.tsx'
    ]
  },
  {
    query: 'current project status',
    group: 'current-status',
    expectedPaths: [
      'STATUS_REPORT.md',
      'docs/BETA_READINESS_CHECKLIST.md'
    ],
    expectedReferences: [
      'src/navigation/types.ts',
      'src/screens/MyBookingsScreen.tsx'
    ],
    requireTopPath: 'STATUS_REPORT.md'
  },
  {
    query: 'continue roadmap next steps current gaps blockers',
    group: 'current-status',
    expectedPaths: [
      'STATUS_REPORT.md',
      'docs/BETA_READINESS_CHECKLIST.md'
    ],
    expectedReferences: [
      'src/navigation/types.ts',
      'src/screens/MyBookingsScreen.tsx'
    ],
    requireTopPath: 'STATUS_REPORT.md'
  },
  {
    query: 'mobile header dark mode',
    group: 'routing',
    expectedPaths: [
      '.agents/knowledge/source-map.json',
      'STATUS_REPORT.md'
    ],
    expectedReferences: [
      'frontend/mobile/src/components/AppHeader.tsx',
      'frontend/mobile/src/hooks/useStatusBarStyle.ts',
      'frontend/mobile/src/theme/colors.ts'
    ]
  },
  {
    query: 'post merge status report dev current gaps blockers',
    group: 'current-status',
    expectedPaths: [
      'STATUS_REPORT.md',
      'docs/BETA_READINESS_CHECKLIST.md'
    ],
    expectedReferences: [
      'src/navigation/types.ts',
      'src/screens/MyBookingsScreen.tsx'
    ],
    rejectedReferences: [
      '.agents/knowledge/sources.js',
      'src/screens/MyBookingsScreen.ts'
    ],
    requireTopPath: 'STATUS_REPORT.md'
  }
];

const OLD_BASELINE_FILES = {
  minimal: [
    'STATUS_REPORT.md'
  ],
  common: [
    'STATUS_REPORT.md',
    'docs/BETA_READINESS_CHECKLIST.md',
    '.claude/session-start-instructions.md'
  ],
  broad: [
    'STATUS_REPORT.md',
    'ROADMAP.md',
    'DOCUMENTATION.md',
    'docs/BETA_READINESS_CHECKLIST.md',
    '.claude/session-start-instructions.md'
  ]
};

function parseArgs(argv) {
  const options = {
    json: false,
    baselineRef: DEFAULT_BASELINE_REF,
    limit: DEFAULT_LIMIT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--baseline-ref') {
      options.baselineRef = argv[++index];
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

function runNodeScript(root, scriptPath, args, env) {
  return execFileSync(
    process.execPath,
    ['--no-warnings', path.join(root, scriptPath), ...args],
    {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024
    }
  ).trimEnd();
}

function createArchiveCheckout(ref, tempRoot) {
  const checkoutDir = path.join(tempRoot, 'baseline');
  fs.mkdirSync(checkoutDir, { recursive: true });

  const archive = execFileSync('git', ['archive', '--format=tar', ref], {
    cwd: ROOT,
    encoding: 'buffer',
    maxBuffer: 200 * 1024 * 1024
  });
  const tar = spawnSync('tar', ['-xf', '-', '-C', checkoutDir], {
    input: archive,
    encoding: 'buffer'
  });

  if (tar.status !== 0) {
    throw new Error(`Failed to extract ${ref} archive: ${String(tar.stderr || '').trim()}`);
  }

  initializeArchiveGit(checkoutDir, ref);

  return checkoutDir;
}

function runGit(root, args) {
  execFileSync('git', args, {
    cwd: root,
    stdio: 'pipe'
  });
}

function initializeArchiveGit(checkoutDir, ref) {
  runGit(checkoutDir, ['init', '--quiet']);
  runGit(checkoutDir, ['add', '--all']);
  runGit(checkoutDir, [
    '-c',
    'user.name=ParkPal Knowledge Benchmark',
    '-c',
    'user.email=knowledge-benchmark@example.invalid',
    'commit',
    '--quiet',
    '--message',
    `Archive baseline ${ref}`
  ]);
}

function buildKnowledgeDb(root, tempRoot, label) {
  const dbDir = path.join(tempRoot, `${label}-db`);
  const dbPath = path.join(dbDir, 'knowledge.db');
  fs.mkdirSync(dbDir, { recursive: true });

  const buildOutput = runNodeScript(root, 'scripts/knowledge/build-index.js', [], {
    KNOWLEDGE_DB_PATH: dbPath
  });

  return {
    dbPath,
    buildOutput
  };
}

function queryKnowledge(root, dbPath, query, limit) {
  const output = runNodeScript(root, 'scripts/knowledge/query.js', [
    query,
    '--json',
    '--limit',
    String(limit)
  ], {
    KNOWLEDGE_DB_PATH: dbPath
  });

  return JSON.parse(output);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function collectReferences(results) {
  return unique(results.flatMap((row) => row.references || []));
}

function rankOfFirstPath(results, expectedPaths) {
  if (!expectedPaths || expectedPaths.length === 0) return null;
  const index = results.findIndex((row) => expectedPaths.includes(row.sourcePath));
  return index === -1 ? null : index + 1;
}

function scoreQuery(spec, payload) {
  const results = payload.results || [];
  const resultPaths = new Set(results.map((row) => row.sourcePath));
  const references = collectReferences(results);
  const referenceSet = new Set(references);
  const expectedPaths = spec.expectedPaths || [];
  const expectedReferences = spec.expectedReferences || [];
  const rejectedReferences = spec.rejectedReferences || [];
  const primaryRank = rankOfFirstPath(results, expectedPaths.slice(0, 1));
  const anyExpectedRank = rankOfFirstPath(results, expectedPaths);
  const pathHitCount = expectedPaths.filter((sourcePath) => resultPaths.has(sourcePath)).length;
  const referenceHitCount = expectedReferences.filter((reference) => referenceSet.has(reference)).length;
  const rejectedReferenceHits = rejectedReferences.filter((reference) => referenceSet.has(reference));
  const expectedAnyHit = spec.expectedAnyPaths
    ? spec.expectedAnyPaths.some((sourcePath) => resultPaths.has(sourcePath))
    : true;

  return {
    topPath: results[0]?.sourcePath || null,
    topSummary: results[0]?.summary || null,
    resultCount: results.length,
    pathHitCount,
    expectedPathCount: expectedPaths.length,
    pathHitRate: expectedPaths.length ? pathHitCount / expectedPaths.length : null,
    referenceHitCount,
    expectedReferenceCount: expectedReferences.length,
    referenceCoverage: expectedReferences.length ? referenceHitCount / expectedReferences.length : null,
    primaryRank,
    anyExpectedRank,
    mrr: primaryRank ? 1 / primaryRank : 0,
    expectedAnyHit,
    rejectedReferenceHits,
    warnings: payload.warnings || []
  };
}

function summarizeScores(scoredQueries, buildKey) {
  const values = scoredQueries.map((item) => item[buildKey]);
  const pathRates = values
    .map((value) => value.pathHitRate)
    .filter((value) => value !== null);
  const refRates = values
    .map((value) => value.referenceCoverage)
    .filter((value) => value !== null);

  return {
    expectedPathHitRate: average(pathRates),
    expectedReferenceCoverage: average(refRates),
    meanReciprocalRank: average(values.map((value) => value.mrr)),
    warnings: values.reduce((total, value) => total + value.warnings.length, 0)
  };
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function signedPct(value) {
  const formatted = `${Math.abs(value * 100).toFixed(1)}pp`;
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function signedNumber(value) {
  const formatted = Math.abs(value).toFixed(3);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function rankLabel(rank) {
  return rank ? `#${rank}` : 'miss';
}

function shortQuery(query) {
  return query.length <= 44 ? query : `${query.slice(0, 41)}...`;
}

function markdownTable(headers, rows) {
  const allRows = [headers, ...rows];
  const widths = headers.map((_, columnIndex) => (
    Math.max(...allRows.map((row) => String(row[columnIndex]).length))
  ));
  const formatRow = (row) => `| ${row.map((cell, columnIndex) => (
    String(cell).padEnd(widths[columnIndex])
  )).join(' | ')} |`;
  const separator = `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`;

  return [
    formatRow(headers),
    separator,
    ...rows.map(formatRow)
  ].join('\n');
}

function readRepoFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readLineRange(root, relativePath, startLine, endLine) {
  const lines = readRepoFile(root, relativePath).split(/\r?\n/);
  return lines.slice(startLine - 1, endLine).join('\n').trimEnd();
}

function parseCitations(contextOutput) {
  const citations = [];
  const citationPattern = /^\d+\.\s+(.+?):(\d+)-(\d+)$/gm;
  let match = citationPattern.exec(contextOutput);

  while (match) {
    citations.push({
      sourcePath: match[1],
      startLine: Number(match[2]),
      endLine: Number(match[3])
    });
    match = citationPattern.exec(contextOutput);
  }

  return citations;
}

function buildCitedExcerptPayload(root, contextOutput) {
  const citations = parseCitations(contextOutput);
  if (citations.length === 0) {
    return 'No cited source line ranges were found in the context output.';
  }

  return citations.map((citation) => [
    `--- ${citation.sourcePath}:${citation.startLine}-${citation.endLine} ---`,
    readLineRange(root, citation.sourcePath, citation.startLine, citation.endLine)
  ].join('\n')).join('\n\n');
}

function buildFullFilePayload(root, files) {
  return files.map((file) => [
    `--- ${file} ---`,
    readRepoFile(root, file)
  ].join('\n')).join('\n\n');
}

function measurePayload(name, command, payload) {
  const characters = payload.length;

  return {
    name,
    command,
    characters,
    estimatedTokens: Math.ceil(characters / 4),
    words: (payload.match(/\S+/g) || []).length,
    bytes: Buffer.byteLength(payload, 'utf8')
  };
}

function savingsPercent(oldBaseline, comparisonBaseline) {
  return ((oldBaseline.estimatedTokens - comparisonBaseline.estimatedTokens) / oldBaseline.estimatedTokens) * 100;
}

function measureTokenSavings(root, dbPath) {
  const intent = 'current project status';
  const env = { KNOWLEDGE_DB_PATH: dbPath };
  const contextOutput = runNodeScript(root, 'scripts/knowledge/context.js', [intent], env);
  const queryOutput = runNodeScript(root, 'scripts/knowledge/query.js', [intent], env);
  const citedExcerptPayload = buildCitedExcerptPayload(root, contextOutput);

  const scenarios = [
    measurePayload(
      'new:context-only',
      `npm run knowledge:context -- "${intent}"`,
      contextOutput
    ),
    measurePayload(
      'new:context-plus-cited',
      `npm run knowledge:context -- "${intent}" + cited source line ranges`,
      `${contextOutput}\n\n${citedExcerptPayload}`
    ),
    measurePayload(
      'old:minimal',
      `npm run knowledge:query -- "${intent}" + STATUS_REPORT.md`,
      `${queryOutput}\n\n${buildFullFilePayload(root, OLD_BASELINE_FILES.minimal)}`
    ),
    measurePayload(
      'old:common',
      `npm run knowledge:query -- "${intent}" + STATUS_REPORT.md + beta checklist + startup instructions`,
      `${queryOutput}\n\n${buildFullFilePayload(root, OLD_BASELINE_FILES.common)}`
    ),
    measurePayload(
      'old:broad',
      `npm run knowledge:query -- "${intent}" + STATUS_REPORT.md + ROADMAP.md + DOCUMENTATION.md + beta checklist + startup instructions`,
      `${queryOutput}\n\n${buildFullFilePayload(root, OLD_BASELINE_FILES.broad)}`
    )
  ];
  const comparisonBaseline = scenarios.find((scenario) => scenario.name === 'new:context-plus-cited');

  return scenarios.map((scenario) => ({
    ...scenario,
    savingsVsContextCited: scenario.name.startsWith('old:')
      ? savingsPercent(scenario, comparisonBaseline)
      : null
  }));
}

function validate(scoredQueries) {
  const failures = [];

  for (const item of scoredQueries) {
    if (item.spec.group === 'session-aware') {
      if (!item.current.expectedAnyHit) {
        failures.push(`${item.spec.query}: current build missed session-aware source-map/session-learning routes.`);
      }
      if (item.current.pathHitCount <= item.baseline.pathHitCount) {
        failures.push(`${item.spec.query}: current expected-path hits did not beat baseline.`);
      }
    }

    if (item.spec.group === 'current-status') {
      if (item.current.topPath !== item.spec.requireTopPath) {
        failures.push(`${item.spec.query}: current top result is ${item.current.topPath || 'none'}, expected ${item.spec.requireTopPath}.`);
      }
      if (item.current.mrr < item.baseline.mrr) {
        failures.push(`${item.spec.query}: current MRR regressed against baseline.`);
      }
      if (item.current.pathHitCount < item.baseline.pathHitCount) {
        failures.push(`${item.spec.query}: current expected-path hits regressed against baseline.`);
      }
    }

    if (item.current.rejectedReferenceHits.length > 0) {
      failures.push(`${item.spec.query}: current results include rejected truncated references: ${item.current.rejectedReferenceHits.join(', ')}.`);
    }
  }

  return failures;
}

function formatReport(report) {
  const topRows = report.queries.map((item) => [
    shortQuery(item.query),
    item.baseline.topPath || 'none',
    item.current.topPath || 'none',
    `${rankLabel(item.baseline.anyExpectedRank)} -> ${rankLabel(item.current.anyExpectedRank)}`
  ]);

  const qualityRows = [
    [
      report.baseline.ref,
      pct(report.summary.baseline.expectedPathHitRate),
      pct(report.summary.baseline.expectedReferenceCoverage),
      report.summary.baseline.meanReciprocalRank.toFixed(3),
      String(report.summary.baseline.warnings)
    ],
    [
      'current working tree',
      pct(report.summary.current.expectedPathHitRate),
      pct(report.summary.current.expectedReferenceCoverage),
      report.summary.current.meanReciprocalRank.toFixed(3),
      String(report.summary.current.warnings)
    ],
    [
      'net improvement',
      signedPct(report.summary.delta.expectedPathHitRate),
      signedPct(report.summary.delta.expectedReferenceCoverage),
      signedNumber(report.summary.delta.meanReciprocalRank),
      '-'
    ]
  ];

  const detailRows = report.queries.map((item) => [
    shortQuery(item.query),
    `${item.baseline.pathHitCount}/${item.baseline.expectedPathCount}`,
    `${item.current.pathHitCount}/${item.current.expectedPathCount}`,
    `${item.baseline.referenceHitCount}/${item.baseline.expectedReferenceCount}`,
    `${item.current.referenceHitCount}/${item.current.expectedReferenceCount}`,
    `${rankLabel(item.baseline.primaryRank)} -> ${rankLabel(item.current.primaryRank)}`
  ]);

  const tokenRows = report.tokenSavings.map((scenario) => [
    scenario.name,
    scenario.estimatedTokens.toLocaleString('en-US'),
    scenario.words.toLocaleString('en-US'),
    scenario.bytes.toLocaleString('en-US'),
    scenario.savingsVsContextCited === null ? '-' : `${scenario.savingsVsContextCited.toFixed(1)}%`
  ]);

  const lines = [
    '# ParkPal Knowledge Index Regression Benchmark',
    '',
    `Baseline ref: ${report.baseline.ref}`,
    `Limit: ${report.limit}`,
    `Baseline build: ${report.baseline.buildSummary}`,
    `Current build: ${report.current.buildSummary}`,
    '',
    '## Top Result Comparison',
    '',
    markdownTable(
      ['Query', 'Baseline top', 'Current top', 'Expected rank'],
      topRows
    ),
    '',
    '## Routing Quality',
    '',
    markdownTable(
      ['Build', 'Expected-path hit rate', 'Expected-reference coverage', 'MRR', 'Warnings'],
      qualityRows
    ),
    '',
    '## Query Detail',
    '',
    markdownTable(
      ['Query', 'Baseline paths', 'Current paths', 'Baseline refs', 'Current refs', 'Primary rank'],
      detailRows
    ),
    '',
    '## Token Savings',
    '',
    'Token estimate: Math.ceil(characterCount / 4)',
    '',
    markdownTable(
      ['Scenario', 'Est. tokens', 'Words', 'Bytes', 'Savings vs new+cited'],
      tokenRows
    ),
    '',
    '## Checks',
    ''
  ];

  if (report.failures.length === 0) {
    lines.push('All regression checks passed.');
  } else {
    lines.push('Regression checks failed:');
    report.failures.forEach((failure) => lines.push(`- ${failure}`));
  }

  return lines.join('\n');
}

function firstLine(value) {
  return String(value || '').split(/\r?\n/)[0] || 'no build output';
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'parkpal-knowledge-regression-'));

  try {
    const baselineRoot = createArchiveCheckout(options.baselineRef, tempRoot);
    const baselineDb = buildKnowledgeDb(baselineRoot, tempRoot, 'baseline');
    const currentDb = buildKnowledgeDb(ROOT, tempRoot, 'current');

    const queries = QUERY_SPECS.map((spec) => {
      const baselinePayload = queryKnowledge(baselineRoot, baselineDb.dbPath, spec.query, options.limit);
      const currentPayload = queryKnowledge(ROOT, currentDb.dbPath, spec.query, options.limit);

      return {
        query: spec.query,
        group: spec.group,
        spec,
        baseline: scoreQuery(spec, baselinePayload),
        current: scoreQuery(spec, currentPayload)
      };
    });

    const baselineSummary = summarizeScores(queries, 'baseline');
    const currentSummary = summarizeScores(queries, 'current');
    const tokenSavings = measureTokenSavings(ROOT, currentDb.dbPath);
    const report = {
      baseline: {
        ref: options.baselineRef,
        buildSummary: firstLine(baselineDb.buildOutput)
      },
      current: {
        buildSummary: firstLine(currentDb.buildOutput)
      },
      limit: options.limit,
      queries,
      summary: {
        baseline: baselineSummary,
        current: currentSummary,
        delta: {
          expectedPathHitRate: currentSummary.expectedPathHitRate - baselineSummary.expectedPathHitRate,
          expectedReferenceCoverage: currentSummary.expectedReferenceCoverage - baselineSummary.expectedReferenceCoverage,
          meanReciprocalRank: currentSummary.meanReciprocalRank - baselineSummary.meanReciprocalRank
        }
      },
      tokenSavings,
      failures: validate(queries)
    };

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatReport(report));
    }

    if (report.failures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main();
}
