const fs = require('fs');
const path = require('path');
const { repoRoot, getKnowledgeConfig, loadSourceConfig } = require('./config');
const { chunkDocument, normalizeText, stableHash } = require('./text');
const { createKnowledgeProvider } = require('./providers');
const repository = require('./repository');
const metrics = require('../../config/metrics');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function toRepoRelative(file, baseRoot = repoRoot) {
  return path.relative(baseRoot, file).replace(/\\/g, '/');
}

function matchesPattern(relative, pattern) {
  const normalized = pattern.replace(/\\/g, '/');
  if (normalized.endsWith('/**')) return relative.startsWith(normalized.slice(0, -3));
  if (normalized.includes('**/*.md')) {
    const prefix = normalized.split('**/*.md')[0];
    return relative.startsWith(prefix) && relative.endsWith('.md');
  }
  if (normalized.includes('*.md')) {
    const prefix = normalized.split('*.md')[0];
    return relative.startsWith(prefix) && relative.endsWith('.md');
  }
  return relative === normalized || relative.endsWith(normalized.replace(/^\.\.\//, ''));
}

function isExcluded(relative, exclude = []) {
  return exclude.some((pattern) => matchesPattern(relative, pattern));
}

function resolveInclude(pattern, baseRoot = repoRoot) {
  const normalized = pattern.replace(/\\/g, '/').replace(/^\.\.\//, '');
  if (normalized.includes('*')) {
    return walk(baseRoot).filter((file) => matchesPattern(toRepoRelative(file, baseRoot), normalized));
  }
  const full = path.resolve(baseRoot, normalized);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return [full];
  return [];
}

function discoverDocuments(sourceConfig = loadSourceConfig(), baseRoot = repoRoot) {
  const docs = [];
  for (const source of sourceConfig.sources || []) {
    const seen = new Set();
    for (const pattern of source.include || []) {
      for (const file of resolveInclude(pattern, baseRoot)) {
        const relative = toRepoRelative(file, baseRoot);
        if (seen.has(relative) || isExcluded(relative, source.exclude || [])) continue;
        seen.add(relative);
        const content = fs.readFileSync(file, 'utf8');
        const title = normalizeText(content).match(/^#\s+(.+)$/m)?.[1] || path.basename(file);
        docs.push({
          source: source.name,
          sourceId: relative,
          title,
          path: relative,
          uri: relative,
          content,
          hash: stableHash(content),
          metadata: { type: source.type || 'markdown' },
        });
      }
    }
  }
  return docs.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function parseArgs(argv) {
  const args = { dryRun: false, source: null, retries: 0, trigger: 'cli' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--source') args.source = argv[++i];
    else if (arg === '--retries') args.retries = Number.parseInt(argv[++i], 10) || 0;
    else if (arg === '--trigger') args.trigger = argv[++i] || 'cli';
  }
  return args;
}

async function indexKnowledge(options = {}) {
  const config = options.config || getKnowledgeConfig();
  const provider = options.provider || createKnowledgeProvider(config);
  const sourceConfig = options.sourceConfig || loadSourceConfig(config.sourceConfigPath);
  const sourceFilter = options.source || null;
  const version = options.version || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const allDocuments = discoverDocuments(sourceConfig).filter((doc) => !sourceFilter || doc.source === sourceFilter);
  const run = options.dryRun ? null : await repository.createRun({
    version,
    source: sourceFilter,
    trigger: options.trigger || 'cli',
    metadata: { sourceConfigPath: config.sourceConfigPath },
  }, options.db);

  const summary = {
    version,
    dryRun: Boolean(options.dryRun),
    discoveredCount: allDocuments.length,
    indexedCount: 0,
    skippedCount: 0,
    chunkCount: 0,
    embeddedCount: 0,
    failedCount: 0,
    errors: [],
  };

  const activeBySource = new Map();
  const started = Date.now();
  for (const document of allDocuments) {
    const doc = { ...document, version };
    const sourceIds = activeBySource.get(doc.source) || [];
    sourceIds.push(doc.sourceId);
    activeBySource.set(doc.source, sourceIds);

    try {
      const chunks = chunkDocument(doc, {
        maxTokens: config.chunkTokenLimit,
        overlapTokens: config.chunkTokenOverlap,
      });
      summary.chunkCount += chunks.length;
      if (options.dryRun) {
        summary.indexedCount += 1;
        continue;
      }

      const reusable = await repository.findReusableDocument(doc, options.db);
      if (reusable) {
        await repository.cloneDocumentWithChunks({ fromDocumentId: reusable.id, document: doc }, options.db);
        summary.skippedCount += 1;
        summary.indexedCount += 1;
        continue;
      }

      const embeddings = chunks.length ? await provider.embed(chunks.map((chunk) => chunk.content)) : [];
      summary.embeddedCount += embeddings.length;
      await repository.upsertDocumentWithChunks({ document: doc, chunks, embeddings }, options.db);
      summary.indexedCount += 1;
    } catch (error) {
      summary.failedCount += 1;
      summary.errors.push({ sourceId: doc.sourceId, message: error.message });
    }
  }

  if (!options.dryRun) {
    for (const [source, sourceIds] of activeBySource.entries()) {
      await repository.deactivateMissingDocuments({ version, source, activeSourceIds: sourceIds }, options.db);
    }
    await repository.completeRun(run.id, {
      status: summary.failedCount > 0 ? 'failed' : 'completed',
      discoveredCount: summary.discoveredCount,
      indexedCount: summary.indexedCount,
      skippedCount: summary.skippedCount,
      chunkCount: summary.chunkCount,
      embeddedCount: summary.embeddedCount,
      failedCount: summary.failedCount,
      errorSummary: summary.errors.slice(0, 5).map((err) => `${err.sourceId}: ${err.message}`).join('\n') || null,
      metadata: { durationMs: Date.now() - started },
    }, options.db);
  }

  metrics.recordKnowledgeIndexingDuration?.((Date.now() - started) / 1000, summary.failedCount > 0 ? 'failed' : 'completed');
  return summary;
}

module.exports = {
  parseArgs,
  discoverDocuments,
  indexKnowledge,
};
