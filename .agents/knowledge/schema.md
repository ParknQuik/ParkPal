# Agent Knowledge Schema

## Chunk Fields

Each indexed chunk is derived from one markdown heading section.

| Field | Meaning |
| --- | --- |
| `id` | Stable chunk id in the form `path#heading#NNN`. |
| `sourcePath` | Repo-relative markdown source path. |
| `headingPath` | Heading hierarchy for the chunk. |
| `subsystem` | Source-level subsystem from `sources.json`. |
| `topics` | Deterministic tags inferred from chunk text. |
| `knowledgeStatus` | One of `current`, `planned`, `historical`, `deprecated`, `needs-verification`. |
| `priority` | Source-level priority from `sources.json`. |
| `summary` | Deterministic short summary from the chunk text. |
| `content` | Original markdown chunk text. |
| `references` | Repo-looking file references extracted from the chunk. |
| `startLine` | First line of the chunk in the source file. |
| `endLine` | Last line of the chunk in the source file. |
| `lastIndexedCommit` | Git short SHA at build time. |
| `lastIndexedAt` | ISO timestamp at build time. |
| `indexHeadCommit` | Git short SHA used to detect whether HEAD moved after the DB was built. |
| `sourceHash` | SHA-256 hash of the source markdown file at build time. |
| `sourceMtimeMs` | Source markdown file mtime in milliseconds at build time. |
| `staleReason` | Deterministic explanation when a chunk is flagged stale. |
| `detectedDate` | Most recent date detected in the chunk, formatted as `YYYY-MM-DD`. |
| `isStale` | Boolean flag for relative time phrases tied to dates older than 30 days. |

## Source Status Overrides

Each source in `sources.json` may define `statusOverrides` in addition to its
source-level `defaultStatus`.

```json
{
  "status": "historical",
  "headingIncludes": ["Historical"],
  "contentIncludes": ["Superseded"],
  "dateBefore": "2026-05-01"
}
```

Override rules are deterministic and local:

- `status` must be one of `current`, `planned`, `historical`, `deprecated`, or
  `needs-verification`.
- `headingIncludes` matches the chunk heading path case-insensitively.
- `contentIncludes` matches the chunk markdown content case-insensitively.
- `dateBefore` requires the chunk's detected date to be earlier than the cutoff.
- When multiple fields are present, all present fields must match. Within
  `headingIncludes` or `contentIncludes`, any listed value may match.

## SQLite Tables

`chunks` stores structured metadata. `chunks_fts` is an FTS5 virtual table used
for ranking query results. Rebuild the database with:

```bash
npm run knowledge:build
```

The database is generated and should not be committed.
