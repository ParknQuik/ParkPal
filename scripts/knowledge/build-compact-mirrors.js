#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const COMPACT_DIR = path.join(ROOT, '.agents/knowledge/compact');
const OVERRIDES_DIR = path.join(COMPACT_DIR, 'overrides');

function repoPath(relativePath) {
  return path.join(ROOT, relativePath);
}

function readLines(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8').split(/\r?\n/);
}

function compactText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u2705\u26a0\ufe0f\ud83d\udcf1\u23f3\ud83d\udcdd\ud83c\udf10]/g, '')
    .trim();
}

function firstLineNumber(lines, pattern, startLine = 1) {
  const startIndex = Math.max(0, startLine - 1);
  for (let index = startIndex; index < lines.length; index += 1) {
    if (pattern.test(lines[index])) return index + 1;
  }
  return startLine;
}

function lineRange(relativePath, pattern, fallbackStart, fallbackEnd, options = {}) {
  const lines = readLines(relativePath);
  const start = firstLineNumber(lines, pattern, options.startLine || 1);
  const end = options.endPattern
    ? Math.max(start, firstLineNumber(lines, options.endPattern, start + 1) - 1)
    : Math.min(lines.length, start + (options.length || fallbackEnd - fallbackStart));

  return {
    path: relativePath,
    start: start || fallbackStart,
    end: end || fallbackEnd
  };
}

function record({ id, h, sys, st = 'current', pri = 'high', d, txt, refs = [], src, tags = [] }) {
  return {
    id,
    h,
    sys,
    st,
    pri,
    d,
    txt: compactText(txt),
    refs,
    src,
    tags
  };
}

function statusRecords() {
  const statusLines = readLines('STATUS_REPORT.md');
  const betaLines = readLines('docs/BETA_READINESS_CHECKLIST.md');
  const readinessLine = firstLineNumber(statusLines, /\*\*Production Readiness:\*\*/);
  const phaseLine = firstLineNumber(statusLines, /\*\*Phase:\*\*/);
  const reconciliationStart = firstLineNumber(statusLines, /^### Current Reconciliation/);
  const stateStart = firstLineNumber(statusLines, /^### Current State/);
  const testStart = firstLineNumber(statusLines, /\*\*Test Status:\*\*/);
  const deployStart = firstLineNumber(statusLines, /^### Development \(Current\)/);
  const gapsStart = firstLineNumber(statusLines, /^### Current Gaps/);
  const prStart = firstLineNumber(statusLines, /^## Open Pull Requests/);
  const scorecardStart = firstLineNumber(statusLines, /^## Production Readiness Scorecard/);
  const blockersStart = firstLineNumber(statusLines, /^## Critical Blockers/);
  const betaEvidenceStart = firstLineNumber(betaLines, /^## Current Validation Evidence/);
  const betaGateStart = firstLineNumber(betaLines, /^## Release Gate/);

  return [
    record({
      id: 'status.current-summary',
      h: 'Current project status',
      sys: 'status',
      st: 'current',
      pri: 'always',
      d: '2026-05-23',
      txt: 'Readiness 95/100. Local evidence: web 85/85, backend 471/473 (2 skipped), mobile TypeScript passing. Gaps: beta/deployment evidence needed. Redis deferred. Mobile distribution pending beta scope. Deployment health needs re-verification.',
      refs: ['STATUS_REPORT.md', 'docs/BETA_READINESS_CHECKLIST.md'],
      src: { path: 'STATUS_REPORT.md', start: readinessLine, end: phaseLine },
      tags: ['current', 'project status', 'readiness', 'startup', 'continue']
    }),
    record({
      id: 'status.reconciliation',
      h: 'Current reconciliation',
      sys: 'status',
      st: 'current',
      pri: 'always',
      d: '2026-05-23',
      txt: 'Local-first dev is the active baseline. Backend Cloud Run health recheck is a future deployment gate, not current stabilization. Next: complete local validation, then beta/deployment evidence.',
      refs: ['STATUS_REPORT.md', 'frontend/mobile/src/navigation/types.ts', 'frontend/mobile/src/screens/MyBookingsScreen.tsx'],
      src: { path: 'STATUS_REPORT.md', start: reconciliationStart, end: reconciliationStart + 1 },
      tags: ['current', 'local-first', 'blockers', 'next steps', 'continue roadmap']
    }),
    record({
      id: 'status.current-state',
      h: 'Current state',
      sys: 'status',
      st: 'current',
      pri: 'high',
      d: '2026-05-23',
      txt: 'Backend and web dev Cloud Run services exist. Mobile is EAS-ready but app-store submission is intentionally deferred during active development.',
      refs: ['STATUS_REPORT.md'],
      src: { path: 'STATUS_REPORT.md', start: stateStart, end: stateStart + 1 },
      tags: ['deployment', 'mobile', 'web', 'backend', 'status']
    }),
    record({
      id: 'status.validation-evidence',
      h: 'Validation evidence',
      sys: 'status',
      st: 'current',
      pri: 'always',
      d: '2026-05-22',
      txt: 'Web 85/85 locally (May 22), backend 471/473 (2 skipped) locally, mobile TypeScript passing locally, targeted booking tests 9/9. Recent PRs #146, #147, #149, and #150 merged into dev.',
      refs: ['STATUS_REPORT.md', 'docs/BETA_READINESS_CHECKLIST.md', 'frontend/mobile/src/screens/MyBookingsScreen.tsx'],
      src: { path: 'STATUS_REPORT.md', start: testStart, end: testStart + 1 },
      tags: ['validation', 'tests', 'web', 'backend', 'mobile', 'beta readiness']
    }),
    record({
      id: 'status.deployment-health',
      h: 'Deployment health',
      sys: 'status',
      st: 'needs-verification',
      pri: 'high',
      d: '2026-05-17',
      txt: 'Backend Cloud Run /health returned 503 degraded from database connectivity on May 17. Web and API docs previously returned 200. Recheck required before beta/deployment sign-off.',
      refs: ['STATUS_REPORT.md', 'docs/BETA_READINESS_CHECKLIST.md'],
      src: { path: 'STATUS_REPORT.md', start: deployStart, end: deployStart + 1 },
      tags: ['deployment', 'cloud run', 'gcp', 'health', 'database', 'beta readiness']
    }),
    record({
      id: 'status.current-gaps',
      h: 'Current gaps',
      sys: 'status',
      st: 'current',
      pri: 'always',
      d: '2026-05-23',
      txt: 'Testing: Redis deferred for cost optimization, no Redis needed for current local MVP. Infrastructure: backend Cloud Run health and web health need re-verification before production. Mobile: app-store distribution deferred until beta scope is finalized.',
      refs: ['STATUS_REPORT.md', 'docs/BETA_READINESS_CHECKLIST.md'],
      src: { path: 'STATUS_REPORT.md', start: gapsStart, end: gapsStart + 3 },
      tags: ['gaps', 'blockers', 'redis', 'deployment', 'mobile distribution', 'continue']
    }),
    record({
      id: 'status.pull-requests',
      h: 'Pull request status',
      sys: 'status',
      st: 'current',
      pri: 'high',
      d: '2026-05-23',
      txt: 'No open PRs against dev as verified on May 23. Recently merged: #151, #150, #149, #147, #146, #145, #144, #143, #142, #138, #137.',
      refs: ['STATUS_REPORT.md'],
      src: { path: 'STATUS_REPORT.md', start: prStart, end: prStart + 3 },
      tags: ['pr', 'branch', 'dev', 'workflow', 'current']
    }),
    record({
      id: 'status.scorecard',
      h: 'Production readiness scorecard',
      sys: 'status',
      st: 'current',
      pri: 'high',
      d: '2026-05-23',
      txt: 'Scorecard: Backend 94/100, Frontend 90/100, Infrastructure 92/100, Testing 92/100, Security 95/100, Performance 92/100, Monitoring 97/100, DX 97/100. Overall: 95/100 GOOD.',
      refs: ['STATUS_REPORT.md'],
      src: { path: 'STATUS_REPORT.md', start: scorecardStart, end: scorecardStart + 1 },
      tags: ['readiness', 'scorecard', 'testing', 'deployment']
    }),
    record({
      id: 'status.blockers',
      h: 'Critical blockers',
      sys: 'status',
      st: 'current',
      pri: 'high',
      d: '2026-05-23',
      txt: 'No current P0 local blocker documented. Key items: backend local suite refreshed (471/473), Redis deferred, mobile distribution waits for beta scope. Backend tests improved from 50/271 to 471/473.',
      refs: ['STATUS_REPORT.md'],
      src: { path: 'STATUS_REPORT.md', start: blockersStart, end: blockersStart + 6 },
      tags: ['blockers', 'p0', 'backend', 'redis', 'mobile distribution']
    }),
    record({
      id: 'status.beta-evidence',
      h: 'Beta readiness evidence',
      sys: 'status',
      st: 'needs-verification',
      pri: 'high',
      d: '2026-05-22',
      txt: 'Evidence table: PR queue clear (verify), git hygiene passed, web tests 85/85, mobile tests 9/9 targeted + 33/33 full, TypeScript resolved, backend 471/473 locally, Cloud Run health 503 degraded (May 17).',
      refs: ['docs/BETA_READINESS_CHECKLIST.md', 'STATUS_REPORT.md'],
      src: { path: 'docs/BETA_READINESS_CHECKLIST.md', start: betaEvidenceStart, end: betaEvidenceStart + 11 },
      tags: ['beta readiness', 'validation', 'payments', 'email', 'maps', 'monitoring']
    }),
    record({
      id: 'status.beta-release-gate',
      h: 'Beta release gate',
      sys: 'status',
      st: 'planned',
      pri: 'high',
      d: '2026-05-22',
      txt: 'Beta proceeds only with: clear PR queue (verify), green/risk-accepted validation, healthy Cloud Run backend, fresh payments/email/maps/monitoring evidence. Not yet scheduled.',
      refs: ['docs/BETA_READINESS_CHECKLIST.md'],
      src: { path: 'docs/BETA_READINESS_CHECKLIST.md', start: betaGateStart, end: betaGateStart + 2 },
      tags: ['release gate', 'beta readiness', 'next actions']
    })
  ];
}

function roadmapRecords() {
  const overview = lineRange('ROADMAP.md', /^## Overview/, 27, 44, { endPattern: /^---$/ });
  const phase1 = lineRange('ROADMAP.md', /^## Phase 1:/, 47, 110, { endPattern: /^---$/ });
  const phase4 = lineRange('ROADMAP.md', /^## Phase 4: Beta Testing/, 266, 345, { startLine: 250, endPattern: /^---$/ });
  const production = lineRange('ROADMAP.md', /^## Phase 5: Production Preparation/, 348, 490, { endPattern: /^---$/ });

  return [
    record({
      id: 'roadmap.current-reality',
      h: 'Current roadmap reality',
      sys: 'planning',
      st: 'current',
      pri: 'always',
      d: '2026-05-22',
      txt: 'Local-first quality stabilization is the active roadmap. Beta readiness stays deferred until evidence gates are complete. Current work is local development, not beta distribution.',
      refs: ['ROADMAP.md', 'STATUS_REPORT.md'],
      src: overview,
      tags: ['roadmap', 'current', 'local-first', 'next steps', 'continue']
    }),
    record({
      id: 'roadmap.target-state',
      h: 'Target state',
      sys: 'planning',
      st: 'planned',
      pri: 'high',
      d: '2026-05-22',
      txt: 'Target: fresh web/backend validation against working local setup, resolve any mobile TypeScript drift, complete beta checklist evidence, then explicit release gate before app-store distribution.',
      refs: ['ROADMAP.md', 'docs/BETA_READINESS_CHECKLIST.md'],
      src: { path: 'ROADMAP.md', start: 38, end: 39 },
      tags: ['roadmap', 'target state', 'validation', 'beta readiness']
    }),
    record({
      id: 'roadmap.backend-fixes-history',
      h: 'Backend fixes history',
      sys: 'planning',
      st: 'historical',
      pri: 'medium',
      d: '2026-03-10',
      txt: 'Phase 1 historical: tests recovered from 50/271 to 269/288 by March 10. Key fixes: PostgreSQL 16 install, test DB creation, Prisma migrations, fixture fixes (+34), slot creation fixes (+18).',
      refs: ['ROADMAP.md'],
      src: { path: 'ROADMAP.md', start: 47, end: 50 },
      tags: ['roadmap', 'historical', 'backend', 'redis']
    }),
    record({
      id: 'roadmap.beta-testing-plan',
      h: 'Beta testing plan',
      sys: 'planning',
      st: 'planned',
      pri: 'medium',
      d: '2026-05-22',
      txt: 'Future work: 10 hosts + 50 drivers, recruit via friends/family/social, launch in batches, monitor registration/payment/booking/error metrics, fix P0/P1 issues before wider release.',
      refs: ['ROADMAP.md', 'docs/BETA_READINESS_CHECKLIST.md'],
      src: { path: 'ROADMAP.md', start: 266, end: 269 },
      tags: ['roadmap', 'beta', 'planned', 'metrics']
    }),
    record({
      id: 'roadmap.production-prep',
      h: 'Production preparation',
      sys: 'planning',
      st: 'planned',
      pri: 'medium',
      d: '2026-05-22',
      txt: 'Future work: infrastructure scaling, monitoring setup, security audit, load testing, marketing prep, and final E2E testing. Timeline: after beta evidence complete and release gate passed.',
      refs: ['ROADMAP.md'],
      src: { path: 'ROADMAP.md', start: 348, end: 350 },
      tags: ['roadmap', 'production', 'infrastructure', 'monitoring', 'load testing']
    })
  ];
}

function workflowRecords() {
  const agentsLineCount = readLines('AGENTS.md').length;
  const readmeLines = readLines('.agents/knowledge/README.md');
  const validationStart = firstLineNumber(readmeLines, /^## Validation/);
  const manualLearningStart = firstLineNumber(readmeLines, /^## Manual Learning Capture/, validationStart + 1);

  return [
    record({
      id: 'workflow.startup-routing',
      h: 'Startup routing',
      sys: 'agent-workflow',
      st: 'current',
      pri: 'always',
      d: '2026-05-23',
      txt: 'Plain startup: rebuild if stale, run knowledge context with limit 1, verify git status and latest commit, then ask what to work on.',
      refs: ['AGENTS.md', '.claude/session-start-instructions.md'],
      src: { path: 'AGENTS.md', start: 1, end: agentsLineCount },
      tags: ['startup', 'agent workflow', 'knowledge context', 'routing']
    }),
    record({
      id: 'workflow.follow-up-context',
      h: 'Follow-up context',
      sys: 'agent-workflow',
      st: 'current',
      pri: 'high',
      d: '2026-05-23',
      txt: 'After task selection use knowledge context with limit 3 or targeted cited ranges; avoid broad docs unless deeper verification is needed.',
      refs: ['AGENTS.md', '.agents/knowledge/README.md'],
      src: { path: 'AGENTS.md', start: 18, end: 23 },
      tags: ['follow-up', 'context', 'agent workflow', 'verification']
    }),
    record({
      id: 'workflow.commit-push',
      h: 'Commit and push policy',
      sys: 'agent-workflow',
      st: 'current',
      pri: 'high',
      d: '2026-05-23',
      txt: 'Before committing or pushing, summarize changes and ask for approval; protected dev/main should use feature branches and PRs.',
      refs: ['AGENTS.md', '.claude/session-start-instructions.md'],
      src: { path: 'AGENTS.md', start: agentsLineCount, end: agentsLineCount },
      tags: ['git', 'commit', 'push', 'pr', 'workflow']
    }),
    record({
      id: 'workflow.knowledge-validation',
      h: 'Knowledge validation',
      sys: 'agent-workflow',
      st: 'current',
      pri: 'high',
      d: '2026-05-23',
      txt: 'Knowledge validation covers freshness, ranking, compact context budgets, source ranges, and routing for status, beta readiness, payments, QR, and mobile theme queries.',
      refs: ['.agents/knowledge/README.md', 'scripts/knowledge/query.js'],
      src: { path: '.agents/knowledge/README.md', start: validationStart, end: manualLearningStart - 2 },
      tags: ['knowledge validate', 'regression', 'compact', 'routing']
    })
  ];
}

function readOverrideRecords(name) {
  const filePath = path.join(OVERRIDES_DIR, `${name}.jsonl`);
  if (!fs.existsSync(filePath)) return [];

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path.relative(ROOT, filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

function writeJsonl(name, records) {
  const merged = [...records, ...readOverrideRecords(name)];
  const outputPath = path.join(COMPACT_DIR, `${name}.jsonl`);
  const content = `${merged.map((item) => JSON.stringify(item)).join('\n')}\n`;
  fs.mkdirSync(COMPACT_DIR, { recursive: true });
  if (fs.existsSync(outputPath) && fs.readFileSync(outputPath, 'utf8') === content) {
    return { name, count: merged.length, path: outputPath, changed: false };
  }
  fs.writeFileSync(outputPath, content);
  return { name, count: merged.length, path: outputPath, changed: true };
}

function main() {
  const outputs = [
    writeJsonl('status', statusRecords()),
    writeJsonl('roadmap', roadmapRecords()),
    writeJsonl('workflow', workflowRecords())
  ];

  for (const output of outputs) {
    const action = output.changed ? 'Wrote' : 'Verified';
    console.log(`${action} ${output.count} compact ${output.name} records at ${path.relative(ROOT, output.path)}.`);
  }
}

if (require.main === module) {
  main();
}
