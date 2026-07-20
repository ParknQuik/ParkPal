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
jest.mock('../config/redis', () => ({ quit: jest.fn() }));
jest.mock('../services/cache', () => ({ get: jest.fn(), set: jest.fn() }));

const knowledgeEval = require('../scripts/knowledge-eval');

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

  test('keeps static documentation questions in knowledge retrieval', () => {
    expect(classifyQuery('How do API versions work?').route).toBe('static_knowledge');
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

  test('token estimator is monotonic enough for budgeting', () => {
    expect(estimateTokens('one two three four')).toBeGreaterThan(estimateTokens('one'));
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
});
