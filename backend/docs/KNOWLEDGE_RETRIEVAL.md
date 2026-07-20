# Production Knowledge Retrieval

ParkNQuik production knowledge retrieval is backend-owned and separate from the `.agents/knowledge` developer index. The developer index still supports Codex and agent context. This system supports runtime admin retrieval, source citations, and future grounded answers.

## Storage

The backend stores indexed documents in PostgreSQL with `pgvector`:

- `KnowledgeDocument` tracks source metadata, version, status, path, and hashes.
- `KnowledgeChunk` tracks structure-aware chunks, token counts, metadata, FTS content, and `vector(1536)` embeddings.
- `KnowledgeIndexingRun` tracks indexing status, counts, errors, and version activation.

Local Docker uses `pgvector/pgvector:pg16`. Production Postgres must allow `CREATE EXTENSION vector` or have pgvector installed ahead of migration.

## Indexing

Run a dry-run first:

```bash
cd backend && npm run knowledge:index -- --dry-run
```

Run indexing:

```bash
cd backend && npm run knowledge:index
```

Optional flags:

```bash
cd backend && npm run knowledge:index -- --source product-docs --retries 2
```

Sources are curated in `backend/config/knowledge/sources.json`. Do not point v1 at every source file. Add markdown/docs or source-map style records that should be safe to cite to users.

A new version is activated only after the indexing run completes. Failed runs remain visible through admin status and do not replace the latest completed version.

## Retrieval

Retrieval uses:

- query routing for static knowledge vs live app/user data
- PostgreSQL full-text search
- pgvector cosine search
- reciprocal-rank fusion
- deterministic dedupe/reranking
- configurable chunk and context limits
- low-confidence no-answer behavior
- source citations with document, section, path, and score metadata

The system must not answer live parking availability, booking status, payment status, or account state from the static knowledge index. Those queries route to live app data instead.

## Admin API

All endpoints require JWT auth and `role=admin`:

- `POST /api/v1/admin/knowledge/index`
- `GET /api/v1/admin/knowledge/status`
- `POST /api/v1/admin/knowledge/retry`
- `POST /api/v1/admin/knowledge/retrieval-debug`
- `POST /api/v1/admin/knowledge/rag-test`
- `GET /api/v1/admin/knowledge/sources`

`rag-test` accepts `query`, optional `role`, `locale`, `tenant`, `version`, and `generate`. `generate` defaults to `false`; when `true`, the route sends the grounded prompt to the configured provider only after retrieval passes the confidence threshold.

## Environment

See `.env.example` for `KNOWLEDGE_*`, `OPENAI_BASE_URL`, and `OPENAI_API_KEY`. Tests use deterministic provider behavior and must not make paid provider calls.

## Evaluation

```bash
cd backend && npm run knowledge:evaluate
```

The default dataset is `backend/docs/knowledge-eval.json`. It should include exact terminology, paraphrases, role-specific questions, outdated/conflicting docs, live-data questions, and unsupported questions.

## Scaling Thresholds

Stay on Postgres + pgvector until evidence says otherwise. Consider a separate vector database around 100k+ active chunks, p95 retrieval above 500 ms after tuning, pgvector maintenance pain, or cross-tenant/cross-repo retrieval requirements.
