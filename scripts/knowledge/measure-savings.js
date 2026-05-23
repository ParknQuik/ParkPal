#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const INTENT = 'current project status';
const STARTUP_LIMIT = 1;
const TASK_CONTEXT_LIMIT = 3;
const REAL_STARTUP_FILE = 'AGENTS.md';

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

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readLineRange(relativePath, startLine, endLine) {
  const lines = readRepoFile(relativePath).split(/\r?\n/);
  return lines.slice(startLine - 1, endLine).join('\n').trimEnd();
}

function parseCitations(contextOutput) {
  const citations = [];
  const citationPattern = /^\d+\.\s+(.+?):(\d+)-(\d+)(?:\s|$)/gm;
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

function buildCitedExcerptPayload(contextOutput) {
  const citations = parseCitations(contextOutput);
  if (citations.length === 0) {
    return 'No cited source line ranges were found in the context output.';
  }

  return citations.map((citation) => [
    `--- ${citation.sourcePath}:${citation.startLine}-${citation.endLine} ---`,
    readLineRange(citation.sourcePath, citation.startLine, citation.endLine)
  ].join('\n')).join('\n\n');
}

function buildFullFilePayload(files) {
  return files.map((file) => [
    `--- ${file} ---`,
    readRepoFile(file)
  ].join('\n')).join('\n\n');
}

function measurePayload(name, command, payload) {
  const characterCount = payload.length;

  return {
    name,
    command,
    payload,
    characters: characterCount,
    estimatedTokens: Math.ceil(characterCount / 4),
    words: (payload.match(/\S+/g) || []).length,
    bytes: Buffer.byteLength(payload, 'utf8')
  };
}

function extractFreshnessWarnings(output) {
  const warnings = [];
  const lines = output.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== 'Freshness warnings:') continue;
    for (let warningIndex = index + 1; warningIndex < lines.length; warningIndex += 1) {
      const warning = lines[warningIndex];
      if (!warning.startsWith('- ')) break;
      warnings.push(warning.slice(2));
    }
  }

  return warnings;
}

function formatInteger(value) {
  return value.toLocaleString('en-US');
}

function savingsPercent(oldBaseline, newBaseline) {
  return ((oldBaseline.estimatedTokens - newBaseline.estimatedTokens) / oldBaseline.estimatedTokens) * 100;
}

function formatScenarioTable(scenarios, comparisonBaseline) {
  const rows = [
    ['Scenario', 'Est. tokens', 'Words', 'Bytes', 'Savings vs compact follow-up']
  ];

  for (const scenario of scenarios) {
    const savings = scenario.name.startsWith('old:')
      ? `${savingsPercent(scenario, comparisonBaseline).toFixed(1)}%`
      : '-';
    rows.push([
      scenario.name,
      formatInteger(scenario.estimatedTokens),
      formatInteger(scenario.words),
      formatInteger(scenario.bytes),
      savings
    ]);
  }

  const widths = rows[0].map((_, columnIndex) => (
    Math.max(...rows.map((row) => row[columnIndex].length))
  ));

  return rows.map((row) => (
    row.map((cell, columnIndex) => cell.padEnd(widths[columnIndex])).join('  ')
  )).join('\n');
}

function formatCommandList(scenarios) {
  return scenarios.map((scenario) => `- ${scenario.name}: ${scenario.command}`).join('\n');
}

function unique(values) {
  return Array.from(new Set(values));
}

function main() {
  const startupContextOutput = runNodeScript('context.js', [INTENT, '--limit', String(STARTUP_LIMIT)]);
  const taskContextOutput = runNodeScript('context.js', [INTENT, '--limit', String(TASK_CONTEXT_LIMIT)]);
  const queryOutput = runNodeScript('query.js', [INTENT]);
  const queryJsonOutput = runNodeScript('query.js', [INTENT, '--json', '--limit', String(TASK_CONTEXT_LIMIT * 5)]);
  const citedExcerptPayload = buildCitedExcerptPayload(taskContextOutput);
  const compactRecordPayload = buildCompactRecordPayload(queryJsonOutput, TASK_CONTEXT_LIMIT);

  const scenarios = [
    measurePayload(
      'startup:agents-md',
      `automatic repo instructions: ${REAL_STARTUP_FILE}`,
      readRepoFile(REAL_STARTUP_FILE)
    ),
    measurePayload(
      'startup:limit-1',
      `npm run knowledge:context -- "${INTENT}" --limit ${STARTUP_LIMIT}`,
      startupContextOutput
    ),
    measurePayload(
      'follow-up:compact-context-plus-records',
      `npm run knowledge:context -- "${INTENT}" --limit ${TASK_CONTEXT_LIMIT} + compact JSONL records`,
      `${taskContextOutput}\n\n${compactRecordPayload}`
    ),
    measurePayload(
      'follow-up:markdown-context-plus-cited',
      `npm run knowledge:context -- "${INTENT}" --limit ${TASK_CONTEXT_LIMIT} + cited canonical source ranges`,
      `${taskContextOutput}\n\n${citedExcerptPayload}`
    ),
    measurePayload(
      'old:minimal',
      `npm run knowledge:query -- "${INTENT}" + STATUS_REPORT.md`,
      `${queryOutput}\n\n${buildFullFilePayload(OLD_BASELINE_FILES.minimal)}`
    ),
    measurePayload(
      'old:common',
      `npm run knowledge:query -- "${INTENT}" + STATUS_REPORT.md + beta checklist + startup instructions`,
      `${queryOutput}\n\n${buildFullFilePayload(OLD_BASELINE_FILES.common)}`
    ),
    measurePayload(
      'old:broad',
      `npm run knowledge:query -- "${INTENT}" + STATUS_REPORT.md + ROADMAP.md + DOCUMENTATION.md + beta checklist + startup instructions`,
      `${queryOutput}\n\n${buildFullFilePayload(OLD_BASELINE_FILES.broad)}`
    )
  ];

  const comparisonBaseline = scenarios.find((scenario) => scenario.name === 'follow-up:compact-context-plus-records');
  const warnings = unique([
    ...extractFreshnessWarnings(startupContextOutput),
    ...extractFreshnessWarnings(taskContextOutput),
    ...extractFreshnessWarnings(queryOutput)
  ]);

  console.log('ParkPal Knowledge Context Savings Benchmark');
  console.log(`Intent: ${INTENT}`);
  console.log(`Real startup instruction file: ${REAL_STARTUP_FILE}`);
  console.log('Token estimate: Math.ceil(characterCount / 4)');
  console.log('');
  console.log(formatScenarioTable(scenarios, comparisonBaseline));
  console.log('');
  console.log('Measured commands and payloads:');
  console.log(formatCommandList(scenarios));
  console.log('');

  if (warnings.length > 0) {
    console.log('Freshness warnings:');
    warnings.forEach((warning) => console.log(`- ${warning}`));
    console.log('');
    console.log('Rebuild with npm run knowledge:build before trusting final benchmark numbers.');
  } else {
    console.log('Freshness warnings: none');
  }
}

if (require.main === module) {
  main();
}
