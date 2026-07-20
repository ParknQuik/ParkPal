const cache = require('../cache');
const metrics = require('../../config/metrics');
const { getKnowledgeConfig } = require('./config');
const { createKnowledgeProvider } = require('./providers');
const repository = require('./repository');
const { estimateTokens, normalizeText, stableHash } = require('./text');

const LIVE_DATA_PATTERNS = [
  /\b(available|availability|open slots?|vacant|occupied)\b/i,
  /\b(booking|reservation|payment|payout|refund|account|profile|vehicle|points)\b/i,
  /\b(my|current|today|now|status)\b/i,
];

function classifyQuery(query) {
  const normalized = normalizeText(query).toLowerCase();
  const liveMatches = LIVE_DATA_PATTERNS.filter((pattern) => pattern.test(normalized)).length;
  if (liveMatches >= 2) {
    return {
      route: 'live_app_data',
      reason: 'Question asks for live parking, booking, payment, account, or current user state.',
    };
  }
  return { route: 'static_knowledge', reason: 'Question can be answered from indexed static knowledge.' };
}

function reciprocalRankFusion({ lexical = [], vector = [], lexicalWeight = 0.45, vectorWeight = 0.55, k = 60 }) {
  const byId = new Map();
  const add = (item, source, weight) => {
    const existing = byId.get(item.id) || { ...item, score: 0, signals: [] };
    existing.score += weight * (1 / (k + item.rank));
    existing.signals.push({ source, rank: item.rank, rawScore: item.score });
    byId.set(item.id, existing);
  };
  lexical.forEach((item) => add(item, 'lexical', lexicalWeight));
  vector.forEach((item) => add(item, 'vector', vectorWeight));
  return Array.from(byId.values()).sort((a, b) => b.score - a.score || a.id - b.id);
}

function dedupeChunks(chunks) {
  const seen = new Set();
  return chunks.filter((chunk) => {
    const key = stableHash(`${chunk.title}:${chunk.section}:${normalizeText(chunk.content).slice(0, 500)}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildCitations(chunks) {
  return chunks.map((chunk, index) => ({
    label: `S${index + 1}`,
    document: chunk.title,
    section: chunk.section,
    path: chunk.path || chunk.uri || null,
    source: chunk.source,
    score: Number(chunk.score.toFixed(4)),
    signals: chunk.signals || [],
  }));
}

function normalizeRrfConfidence(score, config, k = 60) {
  const maxRrfScore = ((config.lexicalWeight || 0) + (config.vectorWeight || 0)) * (1 / (k + 1));
  if (!maxRrfScore) return 0;
  return Math.min(1, score / maxRrfScore);
}

function buildContext(chunks, tokenBudget) {
  const selected = [];
  let usedTokens = 0;
  for (const chunk of chunks) {
    const tokenCount = chunk.tokenCount || estimateTokens(chunk.content);
    if (usedTokens + tokenCount > tokenBudget && selected.length > 0) break;
    selected.push(chunk);
    usedTokens += tokenCount;
  }

  const context = selected.map((chunk, index) => {
    return `[S${index + 1}] ${chunk.title}${chunk.section ? ` / ${chunk.section}` : ''}\n${chunk.content}`;
  }).join('\n\n');

  return { context, chunks: selected, tokenCount: usedTokens };
}

function groundedPrompt({ query, context }) {
  return [
    'You answer ParkNQuik questions using only the supplied knowledge context.',
    'Cite sources with [S#]. Distinguish static documentation from live app data.',
    'If the context does not support the answer, say that the knowledge base does not contain enough information.',
    '',
    `Question: ${query}`,
    '',
    'Knowledge context:',
    context,
  ].join('\n');
}

function cacheKey({ query, role, tenant, locale, version, config }) {
  return [
    'knowledge',
    'retrieval',
    stableHash(JSON.stringify({
      query: normalizeText(query).toLowerCase(),
      role: role || 'anonymous',
      tenant: tenant || 'global',
      locale: locale || 'en',
      version,
      authScope: role || 'anonymous',
      retrievalConfigVersion: config.retrievalConfigVersion,
      finalLimit: config.finalLimit,
      lexicalWeight: config.lexicalWeight,
      vectorWeight: config.vectorWeight,
    })),
  ].join(':');
}


function embeddingCacheKey({ query, config }) {
  return [
    'knowledge',
    'embedding',
    stableHash(JSON.stringify({
      query: normalizeText(query).toLowerCase(),
      provider: config.provider,
      model: config.embeddingModel,
      dimensions: config.embeddingDimensions,
    })),
  ].join(':');
}

function validatedAnswerCacheKey({ query, role, tenant, locale, version, config }) {
  return [
    'knowledge',
    'answer',
    stableHash(JSON.stringify({
      query: normalizeText(query).toLowerCase(),
      role: role || 'anonymous',
      tenant: tenant || 'global',
      locale: locale || 'en',
      version,
      retrievalConfigVersion: config.retrievalConfigVersion,
    })),
  ].join(':');
}

async function getQueryEmbedding({ query, provider, config }) {
  const key = embeddingCacheKey({ query, config });
  const cached = await cache.get(key);
  if (cached) {
    metrics.recordKnowledgeCache?.('embedding', 'hit');
    return cached;
  }
  metrics.recordKnowledgeCache?.('embedding', 'miss');
  const [embedding] = await provider.embed([query]);
  await cache.set(key, embedding, config.cacheTtlSeconds);
  return embedding;
}

async function getValidatedAnswer(params) {
  return cache.get(validatedAnswerCacheKey(params));
}

async function setValidatedAnswer(params, answer) {
  return cache.set(validatedAnswerCacheKey(params), answer, params.config.validatedAnswerTtlSeconds);
}

async function retrieve(query, options = {}) {
  const config = options.config || getKnowledgeConfig();
  const route = classifyQuery(query);
  if (route.route !== 'static_knowledge') {
    return {
      route,
      answerable: false,
      confidence: 0,
      noAnswerReason: route.reason,
      chunks: [],
      citations: [],
    };
  }

  const version = options.version || await repository.getCurrentVersion(options.db);
  if (!version) {
    return {
      route,
      answerable: false,
      confidence: 0,
      noAnswerReason: 'No completed knowledge index is available.',
      chunks: [],
      citations: [],
    };
  }

  const key = cacheKey({ query, role: options.role, tenant: options.tenant, locale: options.locale, version, config });
  const cached = await cache.get(key);
  if (cached) {
    metrics.recordKnowledgeCache?.('retrieval', 'hit');
    return cached;
  }
  metrics.recordKnowledgeCache?.('retrieval', 'miss');

  const provider = options.provider || createKnowledgeProvider(config);
  const cachedAnswer = await getValidatedAnswer({ query, role: options.role, tenant: options.tenant, locale: options.locale, version, config });
  if (cachedAnswer) {
    metrics.recordKnowledgeCache?.('answer', 'hit');
    return cachedAnswer;
  }
  metrics.recordKnowledgeCache?.('answer', 'miss');
  const embedding = await getQueryEmbedding({ query, provider, config });
  const start = Date.now();
  const [lexical, vector] = await Promise.all([
    repository.lexicalSearch({ query, version, limit: config.lexicalLimit, filters: { role: options.role } }, options.db),
    repository.vectorSearch({ embedding, version, limit: config.vectorLimit, filters: { role: options.role } }, options.db),
  ]);
  metrics.recordKnowledgeRetrievalLatency?.('hybrid', (Date.now() - start) / 1000);

  const fused = dedupeChunks(reciprocalRankFusion({
    lexical,
    vector,
    lexicalWeight: config.lexicalWeight,
    vectorWeight: config.vectorWeight,
  })).slice(0, config.finalLimit);

  const confidence = normalizeRrfConfidence(fused[0]?.score || 0, config);
  const answerable = confidence >= config.confidenceThreshold;
  const context = buildContext(fused, config.contextTokenBudget);
  const result = {
    route,
    version,
    answerable,
    confidence,
    noAnswerReason: answerable ? null : 'Retrieved evidence was below the confidence threshold.',
    chunks: context.chunks,
    citations: buildCitations(context.chunks),
    context: context.context,
    contextTokenCount: context.tokenCount,
  };

  if (!answerable) {
    metrics.recordKnowledgeNoAnswer?.(result.noAnswerReason || 'unknown');
  }
  await cache.set(key, result, config.cacheTtlSeconds);
  if (answerable) {
    await setValidatedAnswer({ query, role: options.role, tenant: options.tenant, locale: options.locale, version, config }, result);
  }
  return result;
}

module.exports = {
  classifyQuery,
  reciprocalRankFusion,
  dedupeChunks,
  buildCitations,
  normalizeRrfConfidence,
  buildContext,
  groundedPrompt,
  cacheKey,
  embeddingCacheKey,
  validatedAnswerCacheKey,
  getQueryEmbedding,
  getValidatedAnswer,
  setValidatedAnswer,
  retrieve,
};
