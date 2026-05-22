#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const INTENT = 'current project status';

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
    ['Scenario', 'Est. tokens', 'Words', 'Bytes', 'Savings vs new+cited']
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
  const contextOutput = runNodeScript('context.js', [INTENT]);
  const queryOutput = runNodeScript('query.js', [INTENT]);
  const citedExcerptPayload = buildCitedExcerptPayload(contextOutput);

  const scenarios = [
    measurePayload(
      'new:context-only',
      `npm run knowledge:context -- "${INTENT}"`,
      contextOutput
    ),
    measurePayload(
      'new:context-plus-cited',
      `npm run knowledge:context -- "${INTENT}" + cited source line ranges`,
      `${contextOutput}\n\n${citedExcerptPayload}`
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

  const comparisonBaseline = scenarios.find((scenario) => scenario.name === 'new:context-plus-cited');
  const warnings = unique([
    ...extractFreshnessWarnings(contextOutput),
    ...extractFreshnessWarnings(queryOutput)
  ]);

  console.log('ParkPal Knowledge Context Savings Benchmark');
  console.log(`Intent: ${INTENT}`);
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
