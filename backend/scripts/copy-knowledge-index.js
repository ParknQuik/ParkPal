#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');

const TABLES = ['knowledge_documents', 'knowledge_chunks', 'knowledge_indexing_runs'];
const EXPECTED = { knowledge_documents: 79, knowledge_chunks: 2840, knowledge_indexing_runs: 4 };

async function counts(db) {
  const result = {};
  for (const table of TABLES) {
    const { rows } = await db.query(`SELECT count(*)::int AS count FROM "${table}"`);
    result[table] = rows[0].count;
  }
  return result;
}

async function copyTable(source, target, table, columns, transform = (row) => row) {
  const { rows } = await source.query(`SELECT ${columns.map((c) => `"${c}"`).join(', ')} FROM "${table}" ORDER BY id`);
  const batchSize = 100;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize).map((row) => {
      const transformed = transform(row);
      return Array.isArray(transformed) ? transformed : columns.map((column) => transformed[column]);
    });
    const values = [];
    const groups = batch.map((row, rowIndex) => {
      const placeholders = row.map((value, columnIndex) => {
        values.push(value);
        const cast = table === 'knowledge_chunks' && columns[columnIndex] === 'embedding' ? '::vector' : '';
        return `$${values.length}${cast}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await target.query(`INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES ${groups.join(', ')}`, values);
  }
}

async function main() {
  const sourceUrl = process.env.KNOWLEDGE_SOURCE_DATABASE_URL;
  const targetUrl = process.env.KNOWLEDGE_DATABASE_URL;
  if (!sourceUrl || !targetUrl) throw new Error('KNOWLEDGE_SOURCE_DATABASE_URL and KNOWLEDGE_DATABASE_URL are required');
  if (sourceUrl === targetUrl) throw new Error('Source and target knowledge databases must be different');
  const source = new Client({ connectionString: sourceUrl });
  const target = new Client({ connectionString: targetUrl });
  await Promise.all([source.connect(), target.connect()]);
  try {
    const sourceCounts = await counts(source);
    for (const table of TABLES) {
      if (sourceCounts[table] !== EXPECTED[table]) throw new Error(`Source ${table} count ${sourceCounts[table]} differs from expected ${EXPECTED[table]}`);
    }
    const targetCounts = await counts(target);
    if (Object.values(targetCounts).some((count) => count !== 0)) throw new Error(`Refusing to copy over nonempty target: ${JSON.stringify(targetCounts)}`);

    await target.query('BEGIN');
    await copyTable(source, target, 'knowledge_documents', [
      'id', 'source', 'source_id', 'title', 'path', 'section', 'uri', 'version', 'status', 'hash', 'metadata', 'created_at', 'updated_at', 'indexed_at',
    ]);
    await copyTable(source, target, 'knowledge_chunks', [
      'id', 'document_id', 'version', 'ordinal', 'section', 'content', 'content_hash', 'token_count', 'metadata', 'embedding', 'is_active', 'created_at', 'updated_at',
    ], (row) => row);
    await copyTable(source, target, 'knowledge_indexing_runs', [
      'id', 'version', 'source', 'trigger', 'status', 'discovered_count', 'indexed_count', 'skipped_count', 'chunk_count', 'embedded_count', 'failed_count', 'error_summary', 'metadata', 'started_at', 'completed_at', 'created_at', 'updated_at',
    ]);
    for (const table of TABLES) {
      await target.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT max(id) FROM "${table}"), 1), EXISTS (SELECT 1 FROM "${table}"))`);
    }
    const targetCountsAfterCopy = await counts(target);
    if (JSON.stringify(sourceCounts) !== JSON.stringify(targetCountsAfterCopy)) throw new Error(`Copied counts differ: source=${JSON.stringify(sourceCounts)} target=${JSON.stringify(targetCountsAfterCopy)}`);
    const samples = await source.query('SELECT id, embedding::text AS embedding FROM knowledge_chunks WHERE embedding IS NOT NULL ORDER BY id LIMIT 5');
    for (const row of samples.rows) {
      const copied = await target.query('SELECT embedding::text AS embedding FROM knowledge_chunks WHERE id = $1', [row.id]);
      if (copied.rows[0]?.embedding !== row.embedding) throw new Error(`Embedding verification failed for chunk ${row.id}`);
    }
    await target.query('COMMIT');
    console.log(JSON.stringify({ copied: targetCountsAfterCopy, verifiedSampleEmbeddings: samples.rowCount }, null, 2));
  } catch (error) {
    try { await target.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    await Promise.all([source.end(), target.end()]);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
