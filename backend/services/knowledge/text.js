const crypto = require('crypto');

function normalizeText(input) {
  return String(input || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function estimateTokens(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;
  return Math.ceil(normalized.split(/\s+/).length * 1.3);
}

function splitOversizedSection(section, maxTokens, overlapTokens = 0) {
  const paragraphs = section.content.split(/\n\s*\n/).map(normalizeText).filter(Boolean);
  const chunks = [];
  let current = [];
  let currentTokens = 0;

  const pushCurrent = () => {
    if (!current.length) return;
    chunks.push({ ...section, content: current.join('\n\n') });
    if (overlapTokens > 0) {
      const overlap = [];
      let tokens = 0;
      for (let i = current.length - 1; i >= 0 && tokens < overlapTokens; i -= 1) {
        overlap.unshift(current[i]);
        tokens += estimateTokens(current[i]);
      }
      current = overlap;
      currentTokens = tokens;
    } else {
      current = [];
      currentTokens = 0;
    }
  };

  paragraphs.forEach((paragraph) => {
    const paragraphTokens = estimateTokens(paragraph);
    if (paragraphTokens > maxTokens) {
      pushCurrent();
      const words = paragraph.split(/\s+/);
      const wordsPerChunk = Math.max(1, Math.floor(maxTokens / 1.3));
      for (let i = 0; i < words.length; i += wordsPerChunk) {
        chunks.push({ ...section, content: words.slice(i, i + wordsPerChunk).join(' ') });
      }
      return;
    }

    if (currentTokens + paragraphTokens > maxTokens) {
      pushCurrent();
    }
    current.push(paragraph);
    currentTokens += paragraphTokens;
  });

  pushCurrent();
  return chunks;
}

function parseMarkdownSections(markdown) {
  const lines = normalizeText(markdown).split('\n');
  const sections = [];
  let current = { heading: 'Overview', level: 0, content: [] };

  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      if (current.content.join('\n').trim()) {
        sections.push({ section: current.heading, level: current.level, content: current.content.join('\n') });
      }
      current = { heading: match[2].trim(), level: match[1].length, content: [line] };
    } else {
      current.content.push(line);
    }
  });

  if (current.content.join('\n').trim()) {
    sections.push({ section: current.heading, level: current.level, content: current.content.join('\n') });
  }

  return sections;
}

function chunkDocument(document, options = {}) {
  const maxTokens = options.maxTokens || 420;
  const overlapTokens = options.overlapTokens || 40;
  const sections = parseMarkdownSections(document.content);
  const chunks = [];

  sections.forEach((section) => {
    const content = normalizeText(section.content);
    if (!content) return;
    const split = estimateTokens(content) > maxTokens
      ? splitOversizedSection({ ...section, content }, maxTokens, overlapTokens)
      : [{ ...section, content }];
    split.forEach((chunk) => {
      const normalizedContent = normalizeText(chunk.content);
      chunks.push({
        ordinal: chunks.length,
        section: chunk.section || document.section || 'Overview',
        content: normalizedContent,
        tokenCount: estimateTokens(normalizedContent),
        contentHash: stableHash(`${document.sourceId}:${chunk.section}:${normalizedContent}`),
        metadata: {
          ...(document.metadata || {}),
          headingLevel: chunk.level || null,
          path: document.path || null,
        },
      });
    });
  });

  return chunks;
}

module.exports = {
  normalizeText,
  stableHash,
  estimateTokens,
  chunkDocument,
  parseMarkdownSections,
};
