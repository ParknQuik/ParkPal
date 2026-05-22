#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const KNOWLEDGE_DIR = path.join(ROOT, '.agents/knowledge');
const SOURCES_PATH = path.join(KNOWLEDGE_DIR, 'sources.json');
const DEFAULT_DB_PATH = path.join(
  os.tmpdir(),
  'parkpal-knowledge',
  crypto.createHash('sha1').update(ROOT).digest('hex').slice(0, 12),
  'knowledge.db'
);
const DB_PATH = process.env.KNOWLEDGE_DB_PATH
  ? path.resolve(ROOT, process.env.KNOWLEDGE_DB_PATH)
  : DEFAULT_DB_PATH;

const VALID_STATUSES = new Set([
  'current',
  'planned',
  'historical',
  'deprecated',
  'needs-verification'
]);

const topicRules = [
  [/header|safe\s*area|statusbar|status bar|theme|dark\s*mode/i, ['mobile', 'theme', 'headers']],
  [/payment|paymongo|gcash|maya|card|cash|intent|confirmation/i, ['payments']],
  [/qr|scanner|camera|hook order|useStatusBarStyle|early return/i, ['mobile', 'qr-scanner']],
  [/icon|emoji|MaterialCommunityIcons/i, ['mobile', 'ui']],
  [/cloud\s*run|gcp|deployment|secret manager|cloud sql|redis/i, ['infrastructure', 'deployment']],
  [/auth|login|seed|password|credential/i, ['auth']],
  [/booking|reservation|checkout|penalty|auto-checkout/i, ['booking']],
  [/test|jest|coverage|validation|qa/i, ['testing']],
  [/mobile|expo|react native|ios|android/i, ['mobile']],
  [/backend|api|express|prisma|postgres/i, ['backend']],
  [/web|vite|react|dashboard/i, ['web']],
  [/roadmap|plan|phase|future/i, ['planning']]
];

function repoPath(...parts) {
  return path.join(ROOT, ...parts);
}

function displayPath(filePath) {
  const relativePath = path.relative(ROOT, filePath);
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return filePath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  const absolutePath = repoPath(sourcePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const stat = fs.statSync(absolutePath);

  return {
    sourceHash: crypto.createHash('sha256').update(content).digest('hex'),
    sourceMtimeMs: Math.trunc(stat.mtimeMs)
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'section';
}

function normalizeHeading(raw) {
  return raw.replace(/\s+#+\s*$/g, '').trim();
}

function includesText(haystack, needle) {
  return String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function monthNumber(monthName) {
  const months = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11
  };
  return months[String(monthName || '').toLowerCase()];
}

function extractDates(text) {
  const dates = [];
  const seen = new Set();

  function addDate(date) {
    if (!date || Number.isNaN(date.getTime())) return;
    const isoDate = toIsoDate(date);
    if (seen.has(isoDate)) return;
    seen.add(isoDate);
    dates.push(date);
  }

  for (const match of String(text || '').matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g)) {
    addDate(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
  }

  const monthDatePattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,?\s+(20\d{2})\b/gi;
  for (const match of String(text || '').matchAll(monthDatePattern)) {
    const month = monthNumber(match[1]);
    if (month === undefined) continue;
    addDate(new Date(Date.UTC(Number(match[3]), month, Number(match[2]))));
  }

  return dates.sort((a, b) => b.getTime() - a.getTime());
}

function applyStatusOverrides(chunk, statusOverrides = []) {
  const headingText = chunk.headingPath.join(' > ');
  const contentText = chunk.content;

  for (const rule of statusOverrides) {
    if (rule.headingIncludes && !rule.headingIncludes.some((text) => includesText(headingText, text))) {
      continue;
    }

    if (rule.contentIncludes && !rule.contentIncludes.some((text) => includesText(contentText, text))) {
      continue;
    }

    if (rule.dateBefore) {
      const cutoff = parseDate(rule.dateBefore);
      if (!cutoff || !chunk.detectedDate || parseDate(chunk.detectedDate) >= cutoff) {
        continue;
      }
    }

    chunk.knowledgeStatus = rule.status;
    return;
  }
}

function annotateFreshness(chunk, indexedAt) {
  const haystack = `${chunk.headingPath.join(' ')}\n${chunk.content}`;
  const detectedDates = extractDates(haystack);
  const detectedDate = detectedDates[0] ? toIsoDate(detectedDates[0]) : null;
  const relativeStalePhrase = /\b(this week|immediate actions|next review)\b/i.test(haystack);
  const indexedDate = new Date(indexedAt);
  const ageDays = detectedDates[0]
    ? Math.floor((indexedDate.getTime() - detectedDates[0].getTime()) / 86_400_000)
    : null;

  chunk.detectedDate = detectedDate;
  chunk.isStale = Boolean(relativeStalePhrase && ageDays !== null && ageDays > 30);
  chunk.staleReason = chunk.isStale
    ? `Relative time phrase with detected date ${detectedDate} older than 30 days`
    : null;
}

function parseMarkdown(sourcePath, sourceConfig) {
  const absolutePath = repoPath(sourcePath);
  const text = fs.readFileSync(absolutePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const chunks = [];
  const headingStack = [];
  let current = null;

  function closeChunk(endLine) {
    if (!current) return;

    const content = current.lines.join('\n').trim();
    if (!content) {
      current = null;
      return;
    }

    chunks.push({
      sourcePath,
      headingPath: current.headingPath,
      subsystem: sourceConfig.subsystem,
      knowledgeStatus: sourceConfig.defaultStatus,
      priority: sourceConfig.priority,
      content,
      startLine: current.startLine,
      endLine
    });
    current = null;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line);

    if (headingMatch) {
      closeChunk(lineNumber - 1);
      const level = headingMatch[1].length;
      const title = normalizeHeading(headingMatch[2]);
      headingStack.length = level - 1;
      headingStack[level - 1] = title;
      current = {
        headingPath: headingStack.filter(Boolean),
        startLine: lineNumber,
        lines: [line]
      };
      continue;
    }

    if (!current) {
      current = {
        headingPath: ['Preamble'],
        startLine: lineNumber,
        lines: []
      };
    }
    current.lines.push(line);
  }

  closeChunk(lines.length);
  return chunks;
}

function findEntryLineRange(text, entryId) {
  const lines = text.split(/\r?\n/);
  const idPattern = new RegExp(`"id"\\s*:\\s*"${escapeRegex(entryId)}"`);
  const idIndex = lines.findIndex((line) => idPattern.test(line));
  if (idIndex === -1) {
    return { startLine: 1, endLine: lines.length };
  }

  let startIndex = idIndex;
  while (startIndex > 0 && !/^\s*\{/.test(lines[startIndex])) {
    startIndex -= 1;
  }

  let depth = 0;
  let started = false;
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    for (const char of line) {
      if (char === '{') {
        depth += 1;
        started = true;
      } else if (char === '}') {
        depth -= 1;
      }
    }
    if (started && depth === 0) {
      return { startLine: startIndex + 1, endLine: index + 1 };
    }
  }

  return { startLine: startIndex + 1, endLine: lines.length };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function asList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function parseSourceMap(sourcePath, sourceConfig) {
  const absolutePath = repoPath(sourcePath);
  const text = fs.readFileSync(absolutePath, 'utf8');
  const sourceMap = JSON.parse(text);
  const entries = asList(sourceMap.entries);

  return entries.map((entry) => {
    const sourcePaths = asList(entry.sourcePaths);
    const routeKeywords = asList(entry.routeKeywords);
    const relatedApis = asList(entry.relatedApis);
    const validationCommands = asList(entry.validationCommands);
    const knownFailurePatterns = asList(entry.knownFailurePatterns);
    const { startLine, endLine } = findEntryLineRange(text, entry.id || entry.title || 'entry');
    const title = entry.title || entry.id || sourcePath;
    const content = [
      `# ${title}`,
      '',
      `ID: ${entry.id || 'unknown'}`,
      `Subsystem: ${entry.subsystem || sourceConfig.subsystem}`,
      '',
      '## Route Keywords',
      ...routeKeywords.map((keyword) => `- ${keyword}`),
      '',
      '## Source Paths',
      ...sourcePaths.map((sourcePathValue) => `- ${sourcePathValue}`),
      '',
      '## Related APIs',
      ...relatedApis.map((api) => `- ${api}`),
      '',
      '## Validation Commands',
      ...validationCommands.map((command) => `- ${command}`),
      '',
      '## Known Failure Patterns',
      ...knownFailurePatterns.map((pattern) => `- ${pattern}`)
    ].join('\n');

    return {
      sourcePath,
      headingPath: ['Source Map', title],
      subsystem: entry.subsystem || sourceConfig.subsystem,
      knowledgeStatus: entry.knowledgeStatus || sourceConfig.defaultStatus,
      priority: entry.priority || sourceConfig.priority,
      references: sourcePaths,
      content,
      startLine,
      endLine
    };
  });
}

function inferTopics(chunk) {
  const haystack = `${chunk.headingPath.join(' ')}\n${chunk.content}`;
  const topics = new Set();

  for (const [rule, tags] of topicRules) {
    if (rule.test(haystack)) {
      tags.forEach((tag) => topics.add(tag));
    }
  }

  topics.add(chunk.subsystem);
  return Array.from(topics).sort();
}

function summarize(chunk) {
  const stripped = chunk.content
    .split(/\r?\n/)
    .map((line) => line.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '').trim())
    .filter((line) => line && !/^```/.test(line) && !/^\|/.test(line));

  const first = stripped.find((line) => /[A-Za-z0-9]/.test(line)) || chunk.headingPath.at(-1) || chunk.sourcePath;
  return first.replace(/\s+/g, ' ').slice(0, 220);
}

function extractReferences(chunk) {
  const references = new Set();
  const text = chunk.content;
  const pathPattern = /(?:^|[\s(`["'])((?:(?:backend|frontend|docs|scripts|\.agents|\.claude|prisma|src|test-automator|performance-testing)\/|[A-Za-z0-9_.-]+\/src\/)(?:[A-Za-z0-9_.-]+\/)*(?:[A-Za-z0-9_.-]+\.(?:json|jsx|js|tsx|ts|yaml|yml|toml|sql|env|md|txt)|[A-Za-z0-9_.-]+))/gm;
  let match;

  while ((match = pathPattern.exec(text)) !== null) {
    const candidate = match[1].replace(/[),.;:'"`]+$/g, '');
    if (candidate.includes('node_modules/')) continue;
    references.add(candidate);
  }

  return Array.from(references).sort();
}

function parseSource(sourcePath, sourceConfig) {
  if (sourceConfig.type === 'source-map') {
    return parseSourceMap(sourcePath, sourceConfig);
  }

  return parseMarkdown(sourcePath, sourceConfig);
}

function buildChunkId(chunk, index) {
  const heading = slugify(chunk.headingPath.join('-'));
  return `${chunk.sourcePath}#${heading}#${String(index + 1).padStart(3, '0')}`;
}

function removeDatabaseFiles(dbPath) {
  for (const suffix of ['', '-journal', '-shm', '-wal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

function createDatabase(chunks, dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = DELETE;
    DROP TABLE IF EXISTS chunks_fts;
    DROP TABLE IF EXISTS chunks;
    CREATE TABLE chunks (
      rowid INTEGER PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,
      sourcePath TEXT NOT NULL,
      headingPath TEXT NOT NULL,
      subsystem TEXT NOT NULL,
      topics TEXT NOT NULL,
      knowledgeStatus TEXT NOT NULL,
      priority TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      sourceReferences TEXT NOT NULL,
      startLine INTEGER NOT NULL,
      endLine INTEGER NOT NULL,
      lastIndexedCommit TEXT NOT NULL,
      lastIndexedAt TEXT NOT NULL,
      indexHeadCommit TEXT NOT NULL,
      sourceHash TEXT NOT NULL,
      sourceMtimeMs INTEGER NOT NULL,
      staleReason TEXT,
      detectedDate TEXT,
      isStale INTEGER NOT NULL
    );
    CREATE VIRTUAL TABLE chunks_fts USING fts5(
      id UNINDEXED,
      sourcePath UNINDEXED,
      heading,
      summary,
      topics,
      sourceReferences,
      content
    );
  `);

  const insertChunk = db.prepare(`
    INSERT INTO chunks (
      id, sourcePath, headingPath, subsystem, topics, knowledgeStatus, priority,
      summary, content, sourceReferences, startLine, endLine, lastIndexedCommit,
      lastIndexedAt, indexHeadCommit, sourceHash, sourceMtimeMs, staleReason,
      detectedDate, isStale
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFts = db.prepare(`
    INSERT INTO chunks_fts (
      rowid, id, sourcePath, heading, summary, topics, sourceReferences, content
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const chunk of chunks) {
      const result = insertChunk.run(
        chunk.id,
        chunk.sourcePath,
        JSON.stringify(chunk.headingPath),
        chunk.subsystem,
        JSON.stringify(chunk.topics),
        chunk.knowledgeStatus,
        chunk.priority,
        chunk.summary,
        chunk.content,
        JSON.stringify(chunk.references),
        chunk.startLine,
        chunk.endLine,
        chunk.lastIndexedCommit,
        chunk.lastIndexedAt,
        chunk.indexHeadCommit,
        chunk.sourceHash,
        chunk.sourceMtimeMs,
        chunk.staleReason,
        chunk.detectedDate,
        chunk.isStale ? 1 : 0
      );

      insertFts.run(
        result.lastInsertRowid,
        chunk.id,
        chunk.sourcePath,
        chunk.headingPath.join(' > '),
        chunk.summary,
        chunk.topics.join(' '),
        chunk.references.join(' '),
        chunk.content
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

function writeDatabase(chunks) {
  const dbDir = path.dirname(DB_PATH);
  const dbName = path.basename(DB_PATH);
  const tempDbPath = path.join(dbDir, `.${dbName}.${process.pid}.${Date.now()}.tmp`);

  removeDatabaseFiles(tempDbPath);
  try {
    createDatabase(chunks, tempDbPath);
    fs.renameSync(tempDbPath, DB_PATH);
  } finally {
    removeDatabaseFiles(tempDbPath);
  }
}

function main() {
  const config = readJson(SOURCES_PATH);
  const indexedAt = new Date().toISOString();
  const commit = getShortSha();
  const allChunks = [];

  for (const source of config.sources || []) {
    if (!VALID_STATUSES.has(source.defaultStatus)) {
      throw new Error(`Invalid defaultStatus "${source.defaultStatus}" for ${source.path}`);
    }
    for (const override of source.statusOverrides || []) {
      if (!VALID_STATUSES.has(override.status)) {
        throw new Error(`Invalid status override "${override.status}" for ${source.path}`);
      }
    }

    const absolutePath = repoPath(source.path);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Configured knowledge source does not exist: ${source.path}`);
    }

    const sourceMetadata = getSourceMetadata(source.path);
    const parsed = parseSource(source.path, source);
    parsed.forEach((chunk) => {
      annotateFreshness(chunk, indexedAt);
      applyStatusOverrides(chunk, source.statusOverrides);
      chunk.topics = inferTopics(chunk);
      chunk.summary = summarize(chunk);
      chunk.references = chunk.references || extractReferences(chunk);
      chunk.lastIndexedCommit = commit;
      chunk.lastIndexedAt = indexedAt;
      chunk.indexHeadCommit = commit;
      chunk.sourceHash = sourceMetadata.sourceHash;
      chunk.sourceMtimeMs = sourceMetadata.sourceMtimeMs;
      chunk.id = buildChunkId(chunk, allChunks.length);
      allChunks.push(chunk);
    });
  }

  writeDatabase(allChunks);

  const statusCounts = Object.fromEntries(Array.from(VALID_STATUSES, (status) => [status, 0]));
  for (const chunk of allChunks) {
    statusCounts[chunk.knowledgeStatus] += 1;
  }

  console.log(`Indexed ${config.sources.length} sources, ${allChunks.length} chunks.`);
  console.log(
    `Current: ${statusCounts.current}, planned: ${statusCounts.planned}, historical: ${statusCounts.historical}, deprecated: ${statusCounts.deprecated}, needs-verification: ${statusCounts['needs-verification']}.`
  );
  console.log(`Database: ${displayPath(DB_PATH)}`);
}

main();
