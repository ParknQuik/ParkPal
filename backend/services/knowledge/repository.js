const prisma = require('../../config/prisma');
const { vectorLiteral } = require('./providers');

function json(value) {
  return value == null ? undefined : value;
}

async function getCurrentVersion(db = prisma) {
  const latest = await db.knowledgeIndexingRun.findFirst({
    where: { status: 'completed' },
    orderBy: { completedAt: 'desc' },
  });
  return latest?.version || null;
}

async function getStatus(db = prisma) {
  const [currentRun, latestRun, documentCount, chunkCount] = await Promise.all([
    db.knowledgeIndexingRun.findFirst({ where: { status: 'completed' }, orderBy: { completedAt: 'desc' } }),
    db.knowledgeIndexingRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    db.knowledgeDocument.count({ where: { status: 'active' } }),
    db.knowledgeChunk.count({ where: { isActive: true } }),
  ]);
  return {
    currentVersion: currentRun?.version || null,
    latestRun,
    documentCount,
    chunkCount,
  };
}

async function createRun({ version, source, trigger, metadata }, db = prisma) {
  return db.knowledgeIndexingRun.create({
    data: { version, source, trigger, metadata: json(metadata) },
  });
}

async function completeRun(runId, data, db = prisma) {
  return db.knowledgeIndexingRun.update({
    where: { id: runId },
    data: { ...data, completedAt: new Date() },
  });
}


async function findReusableDocument(document, db = prisma) {
  return db.knowledgeDocument.findFirst({
    where: {
      source: document.source,
      sourceId: document.sourceId,
      hash: document.hash,
      status: 'active',
      version: { not: document.version },
    },
    orderBy: { indexedAt: 'desc' },
  });
}

async function cloneDocumentWithChunks({ fromDocumentId, document }, db = prisma) {
  const savedDocument = await db.knowledgeDocument.upsert({
    where: {
      source_sourceId_version: {
        source: document.source,
        sourceId: document.sourceId,
        version: document.version,
      },
    },
    create: {
      source: document.source,
      sourceId: document.sourceId,
      title: document.title,
      path: document.path,
      section: document.section,
      uri: document.uri,
      version: document.version,
      status: 'active',
      hash: document.hash,
      metadata: json(document.metadata),
      indexedAt: new Date(),
    },
    update: {
      title: document.title,
      path: document.path,
      section: document.section,
      uri: document.uri,
      status: 'active',
      hash: document.hash,
      metadata: json(document.metadata),
      indexedAt: new Date(),
    },
  });

  await db.knowledgeChunk.updateMany({
    where: { documentId: savedDocument.id, version: document.version },
    data: { isActive: false },
  });

  await db.$executeRawUnsafe(
    `INSERT INTO "knowledge_chunks" (
       "document_id", "version", "ordinal", "section", "content", "content_hash",
       "token_count", "metadata", "embedding", "is_active", "created_at", "updated_at"
     )
     SELECT $1, $2, "ordinal", "section", "content", "content_hash",
            "token_count", "metadata", "embedding", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       FROM "knowledge_chunks"
      WHERE "document_id" = $3 AND "is_active" = true
     ON CONFLICT ("document_id", "content_hash", "version") DO UPDATE SET
       "ordinal" = EXCLUDED."ordinal",
       "section" = EXCLUDED."section",
       "content" = EXCLUDED."content",
       "token_count" = EXCLUDED."token_count",
       "metadata" = EXCLUDED."metadata",
       "embedding" = EXCLUDED."embedding",
       "is_active" = true,
       "updated_at" = CURRENT_TIMESTAMP`,
    savedDocument.id,
    document.version,
    fromDocumentId
  );

  return savedDocument;
}

async function upsertDocumentWithChunks({ document, chunks, embeddings }, db = prisma) {
  const savedDocument = await db.knowledgeDocument.upsert({
    where: {
      source_sourceId_version: {
        source: document.source,
        sourceId: document.sourceId,
        version: document.version,
      },
    },
    create: {
      source: document.source,
      sourceId: document.sourceId,
      title: document.title,
      path: document.path,
      section: document.section,
      uri: document.uri,
      version: document.version,
      status: 'active',
      hash: document.hash,
      metadata: json(document.metadata),
      indexedAt: new Date(),
    },
    update: {
      title: document.title,
      path: document.path,
      section: document.section,
      uri: document.uri,
      status: 'active',
      hash: document.hash,
      metadata: json(document.metadata),
      indexedAt: new Date(),
    },
  });

  await db.knowledgeChunk.updateMany({
    where: { documentId: savedDocument.id, version: document.version },
    data: { isActive: false },
  });

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const savedChunk = await db.knowledgeChunk.upsert({
      where: {
        documentId_contentHash_version: {
          documentId: savedDocument.id,
          contentHash: chunk.contentHash,
          version: document.version,
        },
      },
      create: {
        documentId: savedDocument.id,
        version: document.version,
        ordinal: chunk.ordinal,
        section: chunk.section,
        content: chunk.content,
        contentHash: chunk.contentHash,
        tokenCount: chunk.tokenCount,
        metadata: json(chunk.metadata),
        isActive: true,
      },
      update: {
        ordinal: chunk.ordinal,
        section: chunk.section,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        metadata: json(chunk.metadata),
        isActive: true,
      },
    });

    if (embeddings?.[i]) {
      await db.$executeRawUnsafe(
        'UPDATE "knowledge_chunks" SET "embedding" = $1::vector WHERE "id" = $2',
        vectorLiteral(embeddings[i]),
        savedChunk.id
      );
    }
  }

  return savedDocument;
}

async function deactivateMissingDocuments({ version, activeSourceIds, source }, db = prisma) {
  if (!activeSourceIds.length) return { count: 0 };
  const docs = await db.knowledgeDocument.findMany({
    where: { version, source, sourceId: { notIn: activeSourceIds }, status: 'active' },
    select: { id: true },
  });
  const ids = docs.map((doc) => doc.id);
  if (!ids.length) return { count: 0 };
  await db.knowledgeChunk.updateMany({ where: { documentId: { in: ids } }, data: { isActive: false } });
  return db.knowledgeDocument.updateMany({ where: { id: { in: ids } }, data: { status: 'obsolete' } });
}

async function lexicalSearch({ query, version, limit, filters = {} }, db = prisma) {
  const role = filters.role || null;
  const rows = await db.$queryRawUnsafe(
    `SELECT c.id, c.content, c.section, c.token_count AS "tokenCount", c.metadata, d.title, d.path, d.uri, d.source,
            ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', $1)) AS score
       FROM "knowledge_chunks" c
       JOIN "knowledge_documents" d ON d.id = c.document_id
      WHERE c.is_active = true
        AND c.version = $2
        AND to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
        AND ($4::text IS NULL OR COALESCE(c.metadata->>'minRole', 'user') IN ('user', $4))
      ORDER BY score DESC, c.id ASC
      LIMIT $3`,
    query,
    version,
    limit,
    role
  );
  return rows.map((row, index) => ({ ...row, sourceType: 'lexical', rank: index + 1, score: Number(row.score) || 0 }));
}

async function vectorSearch({ embedding, version, limit, filters = {} }, db = prisma) {
  const role = filters.role || null;
  const rows = await db.$queryRawUnsafe(
    `SELECT c.id, c.content, c.section, c.token_count AS "tokenCount", c.metadata, d.title, d.path, d.uri, d.source,
            1 - (c.embedding <=> $1::vector) AS score
       FROM "knowledge_chunks" c
       JOIN "knowledge_documents" d ON d.id = c.document_id
      WHERE c.is_active = true
        AND c.version = $2
        AND c.embedding IS NOT NULL
        AND ($4::text IS NULL OR COALESCE(c.metadata->>'minRole', 'user') IN ('user', $4))
      ORDER BY c.embedding <=> $1::vector ASC, c.id ASC
      LIMIT $3`,
    vectorLiteral(embedding),
    version,
    limit,
    role
  );
  return rows.map((row, index) => ({ ...row, sourceType: 'vector', rank: index + 1, score: Number(row.score) || 0 }));
}

module.exports = {
  getCurrentVersion,
  getStatus,
  createRun,
  completeRun,
  findReusableDocument,
  cloneDocumentWithChunks,
  upsertDocumentWithChunks,
  deactivateMissingDocuments,
  lexicalSearch,
  vectorSearch,
};
