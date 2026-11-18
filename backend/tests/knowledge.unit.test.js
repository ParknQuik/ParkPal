const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  chunkDocument,
  estimateTokens,
  normalizeText,
  stableHash,
} = require('../services/knowledge/text');
const {
  classifyQuery,
  retrieve,
  reciprocalRankFusion,
  dedupeChunks,
  buildContext,
  buildCitations,
  normalizeRrfConfidence,
  cacheKey,
  groundedPrompt,
} = require('../services/knowledge/retrieval');
const { deterministicEmbedding } = require('../services/knowledge/providers');
const { discoverDocuments } = require('../services/knowledge/indexer');
const { ragTestSchema } = require('../validators/knowledge');
jest.mock('../config/prisma', () => ({}));
jest.mock('../config/knowledgePrisma', () => ({}));
jest.mock('../config/redis', () => ({ quit: jest.fn() }));
jest.mock('../services/cache', () => ({ get: jest.fn(), set: jest.fn() }));

const knowledgeEval = require('../scripts/knowledge-eval');
const repository = require('../services/knowledge/repository');
const { indexKnowledge } = require('../services/knowledge/indexer');

describe('knowledge text processing', () => {
  test('normalizes whitespace and hashes stably', () => {
    expect(normalizeText(' A\t  B\r\n\r\n\r\nC ')).toBe('A B\n\nC');
    expect(stableHash('same')).toBe(stableHash('same'));
    expect(stableHash('same')).not.toBe(stableHash('different'));
  });

  test('chunks markdown by headings and token limits', () => {
    const content = [
      '# API Rules',
      'Use /api/v1 for current clients.',
      '',
      '## Payments',
      Array.from({ length: 80 }, (_, i) => `payment${i}`).join(' '),
    ].join('\n');
    const chunks = chunkDocument({
      sourceId: 'docs/api.md',
      path: 'docs/api.md',
      content,
      metadata: { minRole: 'user' },
    }, { maxTokens: 35, overlapTokens: 5 });

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0]).toMatchObject({ ordinal: 0, section: 'API Rules' });
    expect(chunks.every((chunk) => chunk.contentHash && chunk.tokenCount > 0)).toBe(true);
  });
});

describe('knowledge retrieval logic', () => {
  test('routes live transactional questions away from static knowledge', () => {
    const route = classifyQuery('Is my booking paid and available right now?');
    expect(route.route).toBe('live_app_data');
    expect(route.reason).toMatch(/live parking/i);
  });

  test('routes live availability and account questions away from static knowledge', () => {
    expect(classifyQuery('Is commercial parking available right now?').route).toBe('live_app_data');
    expect(classifyQuery('What is my account status today?').route).toBe('live_app_data');
  });

  test('keeps static documentation questions in knowledge retrieval', () => {
    expect(classifyQuery('How do API versions work?').route).toBe('static_knowledge');
  });

  test('routes commercial circling guidance questions to static knowledge', () => {
    expect(classifyQuery('Can commercial parking guidance be booked?').route).toBe('static_knowledge');
  });

  test('fuses lexical and vector ranks, then deduplicates repeated chunks', () => {
    const lexical = [
      { id: 1, rank: 1, score: 0.9, title: 'A', section: 'One', content: 'same content' },
      { id: 2, rank: 2, score: 0.7, title: 'B', section: 'Two', content: 'unique content' },
    ];
    const vector = [
      { id: 2, rank: 1, score: 0.8, title: 'B', section: 'Two', content: 'unique content' },
      { id: 3, rank: 2, score: 0.6, title: 'A', section: 'One', content: 'same content' },
    ];
    const fused = reciprocalRankFusion({ lexical, vector });
    expect(fused[0].id).toBe(2);
    const deduped = dedupeChunks(fused);
    expect(deduped).toHaveLength(2);
    expect(deduped.map((chunk) => chunk.id)).toContain(2);
    expect(new Set(deduped.map((chunk) => chunk.content)).size).toBe(2);
  });

  test.each([
    ['How can I reserve an owner listed parking space?', 'owner-listing'],
    ['Why are commercial facility previews not bookable?', 'commercial-guidance'],
  ])('retrieves the canonical product guide for the multiword %s query', async (query, section) => {
    jest.spyOn(repository, 'getCurrentVersion').mockResolvedValue('v-test');
    jest.spyOn(repository, 'lexicalSearch').mockResolvedValue([{
      id: 1,
      title: 'Parking Product Types and Guidance',
      section,
      path: 'docs/PARKING_PRODUCT_TYPES.md',
      source: 'product-docs',
      score: 0.8,
      rank: 1,
      tokenCount: 20,
      content: 'Owner-listed spaces are bookable; commercial facility previews are non-bookable guidance.',
    }]);
    jest.spyOn(repository, 'vectorSearch').mockResolvedValue([]);
    const provider = { embed: jest.fn(async ([text]) => [deterministicEmbedding(text, 16)]) };
    const result = await retrieve(query, {
      provider,
      config: {
        embeddingDimensions: 16,
        provider: 'test',
        embeddingModel: 'deterministic',
        lexicalLimit: 20,
        vectorLimit: 20,
        finalLimit: 5,
        lexicalWeight: 0.45,
        vectorWeight: 0.55,
        contextTokenBudget: 100,
        cacheTtlSeconds: 10,
        validatedAnswerTtlSeconds: 10,
        confidenceThreshold: 0.1,
        retrievalConfigVersion: 'test',
      },
    });
    expect(result.citations[0].path).toBe('docs/PARKING_PRODUCT_TYPES.md');
    expect(provider.embed).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  test('builds context within budget and emits citations', () => {
    const chunks = [
      { id: 1, title: 'Guide', section: 'Intro', path: 'guide.md', source: 'docs', score: 0.2, content: 'short text', tokenCount: 3 },
      { id: 2, title: 'Guide', section: 'Long', path: 'guide.md', source: 'docs', score: 0.1, content: 'long text', tokenCount: 100 },
    ];
    const context = buildContext(chunks, 10);
    expect(context.chunks).toHaveLength(1);
    expect(context.context).toContain('[S1] Guide / Intro');
    expect(buildCitations(context.chunks)[0]).toMatchObject({ label: 'S1', path: 'guide.md' });
  });

  test('normalizes RRF confidence onto threshold scale', () => {
    const config = { lexicalWeight: 0.45, vectorWeight: 0.55 };
    const topBothSignals = (config.lexicalWeight + config.vectorWeight) * (1 / 61);
    expect(normalizeRrfConfidence(topBothSignals, config)).toBe(1);
    expect(normalizeRrfConfidence(topBothSignals / 2, config)).toBeCloseTo(0.5, 4);
  });

  test('builds a grounded RAG prompt with source labels', () => {
    const prompt = groundedPrompt({ query: 'How do API versions work?', context: '[S1] API Guide\nUse v1.' });
    expect(prompt).toContain('Cite sources with [S#]');
    expect(prompt).toContain('Question: How do API versions work?');
    expect(prompt).toContain('[S1] API Guide');
  });

  test('cache key isolates role, locale, version, and config', () => {
    const base = { query: 'How to upload photos?', version: 'v1', config: { retrievalConfigVersion: 'a', finalLimit: 5, lexicalWeight: 0.5, vectorWeight: 0.5 } };
    expect(cacheKey({ ...base, role: 'user', locale: 'en' })).not.toBe(cacheKey({ ...base, role: 'admin', locale: 'en' }));
    expect(cacheKey({ ...base, role: 'user', locale: 'en' })).not.toBe(cacheKey({ ...base, role: 'user', locale: 'tl' }));
  });
});

describe('knowledge admin validators', () => {
  test('rag test route defaults generation off', () => {
    const { error, value } = ragTestSchema.validate({ query: 'How do API versions work?' });
    expect(error).toBeUndefined();
    expect(value).toMatchObject({ query: 'How do API versions work?', role: 'user', locale: 'en', generate: false });
  });

  test('rag test route accepts explicit generation', () => {
    const { error, value } = ragTestSchema.validate({ query: 'How do API versions work?', generate: true, role: 'admin' });
    expect(error).toBeUndefined();
    expect(value.generate).toBe(true);
    expect(value.role).toBe('admin');
  });
});

describe('knowledge provider and discovery', () => {
  test('deterministic embeddings are normalized and stable', () => {
    const first = deterministicEmbedding('parking payments', 16);
    const second = deterministicEmbedding('parking payments', 16);
    expect(first).toEqual(second);
    expect(first).toHaveLength(16);
    const magnitude = Math.sqrt(first.reduce((sum, value) => sum + value * value, 0));
    expect(magnitude).toBeCloseTo(1, 4);
  });

  test('discovers curated markdown docs and honors excludes', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-'));
    const docsDir = path.join(tmp, 'docs');
    fs.mkdirSync(docsDir);
    fs.writeFileSync(path.join(docsDir, 'one.md'), '# One\nBody');
    fs.writeFileSync(path.join(docsDir, 'skip.md'), '# Skip\nBody');

    const previous = process.cwd();
    try {
      const sourceConfig = {
        sources: [{ name: 'test', type: 'markdown', include: ['docs/**/*.md'], exclude: ['docs/skip.md'] }],
      };
      const discovered = discoverDocuments(sourceConfig, tmp);
      expect(discovered.map((doc) => doc.sourceId)).toContain('docs/one.md');
      expect(discovered.map((doc) => doc.sourceId)).not.toContain('docs/skip.md');
    } finally {
      process.chdir(previous);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('production source list includes canonical guidance and excludes historical markdown', () => {
    const { loadSourceConfig } = require('../services/knowledge/config');
    const sourceConfig = loadSourceConfig();
    const discovered = discoverDocuments(sourceConfig).map((doc) => doc.sourceId);
    expect(discovered).toContain('docs/PARKING_PRODUCT_TYPES.md');
    expect(discovered).toContain('docs/PARKPAL_SYSTEM_ARCHITECTURE.md');
    expect(discovered).not.toContain('README.md');
    expect(discovered).not.toContain('docs/phase-completions/HISTORY.md');
    expect(discovered).not.toContain('docs/plans/rag-dev-handover-2026-07-26.md');
    expect(discovered).not.toContain('docs/audits-reviews/BACKEND_SECURITY_PERFORMANCE_AUDIT.md');
  });

  test('token estimator is monotonic enough for budgeting', () => {
    expect(estimateTokens('one two three four')).toBeGreaterThan(estimateTokens('one'));
  });
});

describe('knowledge repository version behavior', () => {
  test('uses exact lexical matches first and appends OR matches when exact results are sparse', async () => {
    const db = { $queryRawUnsafe: jest.fn()
      .mockResolvedValueOnce([
        { id: 1, score: 0.8, content: 'exact one' },
        { id: 2, score: 0.7, content: 'exact two' },
      ])
      .mockResolvedValueOnce([
        { id: 3, score: 0.4, content: 'relaxed three' },
        { id: 4, score: 0.3, content: 'relaxed four' },
      ]) };

    const result = await repository.lexicalSearch({ query: 'owner listed booking', version: 'v1', limit: 5 }, db);
    expect(result.map((row) => row.id)).toEqual([1, 2, 3, 4]);
    expect(result.map((row) => row.matchType)).toEqual(['exact', 'exact', 'relaxed', 'relaxed']);
    expect(result.map((row) => row.rank)).toEqual([1, 2, 3, 4]);
    expect(db.$queryRawUnsafe.mock.calls[1][0]).toContain("websearch_to_tsquery('english', $1)");
    expect(db.$queryRawUnsafe.mock.calls[1][1]).toBe('owner OR listed OR booking');
    expect(db.$queryRawUnsafe.mock.calls[1][5]).toEqual([1, 2]);
  });

  test('does not run relaxed search when three exact results are present', async () => {
    const db = { $queryRawUnsafe: jest.fn().mockResolvedValue([
      { id: 1, score: 0.8 }, { id: 2, score: 0.7 }, { id: 3, score: 0.6 },
    ]) };
    await repository.lexicalSearch({ query: 'owner listed booking', version: 'v1', limit: 5 }, db);
    expect(db.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  test('status counts only active documents and chunks from current full index version', async () => {
    const db = {
      knowledgeIndexingRun: { findFirst: jest.fn()
        .mockResolvedValueOnce({ version: 'full-v3' })
        .mockResolvedValueOnce({ version: 'source-v4', source: 'product-docs' }) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(4) },
      knowledgeChunk: { count: jest.fn().mockResolvedValue(12) },
    };
    const status = await repository.getStatus(db);
    expect(status).toMatchObject({ currentVersion: 'full-v3', documentCount: 4, chunkCount: 12 });
    expect(db.knowledgeDocument.count).toHaveBeenCalledWith({ where: { status: 'active', version: 'full-v3' } });
    expect(db.knowledgeChunk.count).toHaveBeenCalledWith({ where: { isActive: true, version: 'full-v3' } });
  });

  test('prunes document versions outside the latest three successful full runs', async () => {
    const db = {
      knowledgeIndexingRun: { findMany: jest.fn().mockResolvedValue([
        { version: 'v5' }, { version: 'v4' }, { version: 'v3' }, { version: 'partial' }, { version: 'v2' },
      ]) },
      knowledgeDocument: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
    };
    await repository.pruneOldVersions(db);
    expect(db.knowledgeDocument.deleteMany).toHaveBeenCalledWith({ where: { version: { notIn: ['v5', 'v4', 'v3'] } } });
    expect(db.knowledgeIndexingRun.findMany.mock.calls[0][0].where).toMatchObject({ source: null, status: 'completed', failedCount: 0 });
  });
});

describe('knowledge index retention trigger', () => {
  const original = {};
  beforeEach(() => {
    for (const method of ['createRun', 'findReusableDocument', 'upsertDocumentWithChunks', 'deactivateMissingDocuments', 'completeRun', 'pruneOldVersions']) {
      original[method] = jest.spyOn(repository, method).mockImplementation(async () => method === 'createRun' ? { id: 1 } : undefined);
    }
  });
  afterEach(() => {
    Object.values(original).forEach((spy) => spy.mockRestore());
    for (const key of Object.keys(original)) delete original[key];
  });

  const options = (overrides = {}) => ({
    sourceConfig: { sources: [{ name: 'docs', include: ['README.md'] }] },
    config: { chunkTokenLimit: 420, chunkTokenOverlap: 40 },
    provider: { embed: jest.fn(async (contents) => contents.map(() => [0.5])) },
    ...overrides,
  });

  test('prunes only after a successful non-empty full-corpus run', async () => {
    await indexKnowledge(options());
    expect(repository.pruneOldVersions).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['source filtered', { source: 'docs' }],
    ['empty', { sourceConfig: { sources: [] } }],
    ['failed', { provider: { embed: jest.fn().mockRejectedValue(new Error('embedding failed')) } }],
  ])('does not prune after a %s run', async (_label, override) => {
    await indexKnowledge(options(override));
    expect(repository.pruneOldVersions).not.toHaveBeenCalled();
  });
});

describe('knowledge evaluation reporting', () => {
  test('builds actionable per-query rows', () => {
    const row = knowledgeEval.evaluateResult(
      { query: 'How do API versions work?', expectedPath: 'backend/API_VERSIONING_GUIDE.md' },
      {
        answerable: true,
        confidence: 0.81234,
        contextTokenCount: 42,
        citations: [
          { path: 'backend/API_VERSIONING_GUIDE.md' },
          { path: 'backend/docs/OTHER.md' },
        ],
      }
    );

    expect(row).toMatchObject({
      expectedPath: 'backend/API_VERSIONING_GUIDE.md',
      topCitation: 'backend/API_VERSIONING_GUIDE.md',
      answerable: true,
      confidence: 0.8123,
      contextTokenCount: 42,
      passed: true,
    });
  });

  test('evaluates citations with deterministic embeddings and live-data no-answer coverage', async () => {
    jest.spyOn(repository, 'getCurrentVersion').mockResolvedValue('v-eval');
    jest.spyOn(repository, 'lexicalSearch').mockImplementation(async ({ query }) => {
      const guide = query.toLowerCase().includes('commercial');
      return [{
        id: guide ? 8 : 9,
        title: guide ? 'Parking Product Types and Guidance' : 'API Versioning Guide',
        path: guide ? 'docs/PARKING_PRODUCT_TYPES.md' : 'backend/API_VERSIONING_GUIDE.md',
        source: 'product-docs',
        section: 'Overview',
        score: 0.9,
        rank: 1,
        tokenCount: 20,
        content: 'Current product and API guidance.',
      }];
    });
    jest.spyOn(repository, 'vectorSearch').mockResolvedValue([]);
    const provider = { embed: jest.fn(async ([text]) => [deterministicEmbedding(text, 16)]) };
    const config = {
      embeddingDimensions: 16, provider: 'test', embeddingModel: 'deterministic',
      lexicalLimit: 20, vectorLimit: 20, finalLimit: 5, lexicalWeight: 0.45, vectorWeight: 0.55,
      contextTokenBudget: 100, cacheTtlSeconds: 10, validatedAnswerTtlSeconds: 10,
      confidenceThreshold: 0.1, retrievalConfigVersion: 'test',
    };
    const dataset = [
      { query: 'Can commercial facility parking be booked?', expectedPath: 'docs/PARKING_PRODUCT_TYPES.md' },
      { query: 'What API version should clients use?', expectedPath: 'backend/API_VERSIONING_GUIDE.md' },
      { query: 'Is my current booking paid?', expectedNoAnswer: true },
    ];
    const report = await knowledgeEval.runEvaluation(dataset, (query, options) => retrieve(query, {
      ...options, provider, config,
    }));

    expect(report.passedCount).toBe(3);
    expect(report.recallAtK).toBe(1);
    expect(report.noAnswerAccuracy).toBe(1);
    expect(provider.embed).toHaveBeenCalledTimes(2);
    jest.restoreAllMocks();
  });
});
