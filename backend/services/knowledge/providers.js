const { normalizeText, stableHash } = require('./text');
const { getKnowledgeConfig } = require('./config');

function deterministicEmbedding(text, dimensions = 1536) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = normalizeText(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  tokens.forEach((token) => {
    const hash = stableHash(token);
    const index = Number.parseInt(hash.slice(0, 8), 16) % dimensions;
    const sign = Number.parseInt(hash.slice(8, 10), 16) % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  });
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

function vectorLiteral(vector) {
  return `[${vector.map((value) => Number(value).toFixed(6)).join(',')}]`;
}

class DeterministicKnowledgeProvider {
  constructor(config = getKnowledgeConfig()) {
    this.config = config;
  }

  async embed(texts) {
    return texts.map((text) => deterministicEmbedding(text, this.config.embeddingDimensions));
  }

  async chat({ prompt }) {
    return { text: prompt, usage: { promptTokens: 0, completionTokens: 0 } };
  }
}

class OpenAICompatibleKnowledgeProvider {
  constructor(config = getKnowledgeConfig()) {
    this.config = config;
  }

  async embed(texts) {
    if (!this.config.openAiApiKey) {
      if (process.env.NODE_ENV === 'test') {
        return texts.map((text) => deterministicEmbedding(text, this.config.embeddingDimensions));
      }
      throw new Error('OPENAI_API_KEY is required for knowledge embeddings');
    }

    const response = await fetch(`${this.config.openAiBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.config.embeddingModel, input: texts }),
    });

    if (!response.ok) {
      throw new Error(`Embedding provider failed with ${response.status}`);
    }

    const body = await response.json();
    return body.data.map((item) => item.embedding);
  }

  async chat({ messages, prompt }) {
    if (!this.config.openAiApiKey) {
      if (process.env.NODE_ENV === 'test') {
        return { text: prompt || messages?.map((m) => m.content).join('\n') || '', usage: {} };
      }
      throw new Error('OPENAI_API_KEY is required for knowledge generation');
    }

    const response = await fetch(`${this.config.openAiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.config.chatModel, messages }),
    });

    if (!response.ok) {
      throw new Error(`Chat provider failed with ${response.status}`);
    }

    const body = await response.json();
    return {
      text: body.choices?.[0]?.message?.content || '',
      usage: body.usage || {},
    };
  }
}

function createKnowledgeProvider(config = getKnowledgeConfig()) {
  if (config.provider === 'deterministic' || process.env.NODE_ENV === 'test') {
    return new DeterministicKnowledgeProvider(config);
  }
  return new OpenAICompatibleKnowledgeProvider(config);
}

module.exports = {
  DeterministicKnowledgeProvider,
  OpenAICompatibleKnowledgeProvider,
  createKnowledgeProvider,
  deterministicEmbedding,
  vectorLiteral,
};
