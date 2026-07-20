CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "knowledge_documents" (
  "id" SERIAL PRIMARY KEY,
  "source" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "path" TEXT,
  "section" TEXT,
  "uri" TEXT,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "hash" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "indexed_at" TIMESTAMP(3)
);

CREATE TABLE "knowledge_chunks" (
  "id" SERIAL PRIMARY KEY,
  "document_id" INTEGER NOT NULL REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "version" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "section" TEXT,
  "content" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "token_count" INTEGER NOT NULL,
  "metadata" JSONB,
  "embedding" vector(1536),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "knowledge_indexing_runs" (
  "id" SERIAL PRIMARY KEY,
  "version" TEXT NOT NULL,
  "source" TEXT,
  "trigger" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "discovered_count" INTEGER NOT NULL DEFAULT 0,
  "indexed_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "chunk_count" INTEGER NOT NULL DEFAULT 0,
  "embedded_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "error_summary" TEXT,
  "metadata" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "knowledge_documents_source_source_id_version_key" ON "knowledge_documents"("source", "source_id", "version");
CREATE INDEX "knowledge_documents_status_version_idx" ON "knowledge_documents"("status", "version");
CREATE INDEX "knowledge_documents_source_hash_idx" ON "knowledge_documents"("source", "hash");
CREATE INDEX "knowledge_documents_path_idx" ON "knowledge_documents"("path");
CREATE UNIQUE INDEX "knowledge_chunks_document_id_content_hash_version_key" ON "knowledge_chunks"("document_id", "content_hash", "version");
CREATE INDEX "knowledge_chunks_version_is_active_idx" ON "knowledge_chunks"("version", "is_active");
CREATE INDEX "knowledge_chunks_content_hash_idx" ON "knowledge_chunks"("content_hash");
CREATE INDEX "knowledge_chunks_document_id_ordinal_idx" ON "knowledge_chunks"("document_id", "ordinal");
CREATE INDEX "knowledge_chunks_metadata_gin_idx" ON "knowledge_chunks" USING GIN ("metadata");
CREATE INDEX "knowledge_chunks_fts_idx" ON "knowledge_chunks" USING GIN (to_tsvector('english', "content"));
CREATE INDEX "knowledge_chunks_embedding_hnsw_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops) WHERE "embedding" IS NOT NULL;
CREATE INDEX "knowledge_indexing_runs_status_version_idx" ON "knowledge_indexing_runs"("status", "version");
CREATE INDEX "knowledge_indexing_runs_source_idx" ON "knowledge_indexing_runs"("source");
CREATE INDEX "knowledge_indexing_runs_started_at_idx" ON "knowledge_indexing_runs"("started_at");
