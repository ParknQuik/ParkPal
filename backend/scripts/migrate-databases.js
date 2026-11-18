#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');
const { spawnSync } = require('child_process');

const legacyKnowledgeMigration = '20260720000000_add_knowledge_retrieval';
const knowledgeTables = ['knowledge_documents', 'knowledge_chunks', 'knowledge_indexing_runs'];

function prisma(args, schema) {
  const result = spawnSync('npx', ['prisma', ...args, '--schema', schema], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}

async function baselineLegacyAppMigration() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const found = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [knowledgeTables]
    );
    if (found.rows.length) {
      throw new Error(`Refusing to baseline ${legacyKnowledgeMigration}: app database contains RAG tables (${found.rows.map(r => r.table_name).join(', ')}). Move/verify those records first.`);
    }
    const applied = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations'`
    );
    if (applied.rowCount) {
      const record = await client.query('SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 AND rolled_back_at IS NULL', [legacyKnowledgeMigration]);
      if (record.rowCount) return;
    }
  } finally {
    await client.end();
  }
  prisma(['migrate', 'resolve', '--applied', legacyKnowledgeMigration], 'prisma/schema.prisma');
}

(async () => {
  if (!process.env.DATABASE_URL || !process.env.KNOWLEDGE_DATABASE_URL) {
    throw new Error('Both DATABASE_URL and KNOWLEDGE_DATABASE_URL are required to migrate databases');
  }
  await baselineLegacyAppMigration();
  prisma(['migrate', 'deploy'], 'prisma/schema.prisma');
  prisma(['migrate', 'deploy'], 'prisma/knowledge/schema.prisma');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
