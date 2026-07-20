const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { indexKnowledge } = require('../services/knowledge/indexer');
const { retrieve, groundedPrompt } = require('../services/knowledge/retrieval');
const { getKnowledgeConfig } = require('../services/knowledge/config');
const { createKnowledgeProvider } = require('../services/knowledge/providers');
const repository = require('../services/knowledge/repository');

exports.triggerIndexing = asyncHandler(async (req, res) => {
  const summary = await indexKnowledge({
    dryRun: req.body.dryRun,
    source: req.body.source,
    retries: req.body.retries,
    trigger: `admin:${req.user.id}`,
  });
  res.status(req.body.dryRun ? 200 : 202).json({ success: true, summary });
});

exports.status = asyncHandler(async (req, res) => {
  const status = await repository.getStatus();
  res.json({ success: true, status });
});

exports.retryFailed = asyncHandler(async (req, res) => {
  const latestFailed = await prisma.knowledgeIndexingRun.findFirst({
    where: { status: 'failed' },
    orderBy: { startedAt: 'desc' },
  });
  const summary = await indexKnowledge({
    source: req.body.source || latestFailed?.source || null,
    retries: req.body.retries,
    trigger: `admin-retry:${req.user.id}`,
  });
  res.status(202).json({ success: true, previousRun: latestFailed, summary });
});

exports.retrievalDebug = asyncHandler(async (req, res) => {
  const result = await retrieve(req.body.query, {
    role: req.body.role,
    locale: req.body.locale,
    tenant: req.body.tenant,
    version: req.body.version,
  });
  res.json({
    success: true,
    debug: {
      route: result.route,
      version: result.version,
      answerable: result.answerable,
      confidence: result.confidence,
      noAnswerReason: result.noAnswerReason,
      contextTokenCount: result.contextTokenCount,
      citations: result.citations,
      chunks: result.chunks.map((chunk) => ({
        id: chunk.id,
        title: chunk.title,
        section: chunk.section,
        path: chunk.path,
        score: chunk.score,
        signals: chunk.signals,
      })),
    },
  });
});

exports.ragTest = asyncHandler(async (req, res) => {
  const result = await retrieve(req.body.query, {
    role: req.body.role,
    locale: req.body.locale,
    tenant: req.body.tenant,
    version: req.body.version,
  });

  const test = {
    route: result.route,
    version: result.version,
    answerable: result.answerable,
    confidence: result.confidence,
    noAnswerReason: result.noAnswerReason,
    contextTokenCount: result.contextTokenCount || 0,
    citations: result.citations,
    answer: null,
    usage: null,
    generated: false,
  };

  if (req.body.generate && result.answerable) {
    const config = getKnowledgeConfig();
    const provider = createKnowledgeProvider(config);
    const prompt = groundedPrompt({ query: req.body.query, context: result.context });
    const generation = await provider.chat({
      prompt,
      messages: [
        { role: 'system', content: 'Answer only from supplied ParkNQuik knowledge context and cite sources as [S#].' },
        { role: 'user', content: prompt },
      ],
    });
    test.answer = generation.text;
    test.usage = generation.usage || null;
    test.generated = true;
  }

  res.json({ success: true, test });
});

exports.sources = asyncHandler(async (req, res) => {
  const where = {
    status: 'active',
    ...(req.query.source ? { source: req.query.source } : {}),
  };
  const [documents, total] = await Promise.all([
    prisma.knowledgeDocument.findMany({
      where,
      orderBy: [{ source: 'asc' }, { path: 'asc' }],
      take: req.query.limit,
      skip: req.query.offset,
      select: {
        id: true,
        source: true,
        sourceId: true,
        title: true,
        path: true,
        version: true,
        status: true,
        hash: true,
        metadata: true,
        indexedAt: true,
        _count: { select: { chunks: true } },
      },
    }),
    prisma.knowledgeDocument.count({ where }),
  ]);
  res.json({
    success: true,
    documents,
    pagination: { total, limit: req.query.limit, offset: req.query.offset },
  });
});
