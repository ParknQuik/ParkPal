const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');
const backendRoot = path.resolve(__dirname, '../..');

function intEnv(name, fallback) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) ? value : fallback;
}

function floatEnv(name, fallback) {
  const value = Number.parseFloat(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function getKnowledgeConfig() {
  return {
    provider: process.env.KNOWLEDGE_PROVIDER || 'openai-compatible',
    embeddingModel: process.env.KNOWLEDGE_EMBEDDING_MODEL || 'text-embedding-3-small',
    chatModel: process.env.KNOWLEDGE_CHAT_MODEL || 'gpt-4o-mini',
    openAiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    embeddingDimensions: intEnv('KNOWLEDGE_EMBEDDING_DIMENSIONS', 1536),
    lexicalLimit: intEnv('KNOWLEDGE_LEXICAL_LIMIT', 20),
    vectorLimit: intEnv('KNOWLEDGE_VECTOR_LIMIT', 20),
    finalLimit: intEnv('KNOWLEDGE_FINAL_LIMIT', 5),
    lexicalWeight: floatEnv('KNOWLEDGE_LEXICAL_WEIGHT', 0.45),
    vectorWeight: floatEnv('KNOWLEDGE_VECTOR_WEIGHT', 0.55),
    contextTokenBudget: intEnv('KNOWLEDGE_CONTEXT_TOKEN_BUDGET', 1800),
    chunkTokenLimit: intEnv('KNOWLEDGE_CHUNK_TOKEN_LIMIT', 420),
    chunkTokenOverlap: intEnv('KNOWLEDGE_CHUNK_TOKEN_OVERLAP', 40),
    cacheTtlSeconds: intEnv('KNOWLEDGE_CACHE_TTL_SECONDS', 300),
    validatedAnswerTtlSeconds: intEnv('KNOWLEDGE_VALIDATED_ANSWER_TTL_SECONDS', 900),
    confidenceThreshold: floatEnv('KNOWLEDGE_CONFIDENCE_THRESHOLD', 0.18),
    retrievalConfigVersion: process.env.KNOWLEDGE_RETRIEVAL_CONFIG_VERSION || 'v1',
    sourceConfigPath: path.resolve(
      backendRoot,
      process.env.KNOWLEDGE_SOURCE_CONFIG_PATH || 'config/knowledge/sources.json'
    ),
  };
}

function loadSourceConfig(configPath = getKnowledgeConfig().sourceConfigPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

module.exports = {
  backendRoot,
  repoRoot,
  getKnowledgeConfig,
  loadSourceConfig,
};
