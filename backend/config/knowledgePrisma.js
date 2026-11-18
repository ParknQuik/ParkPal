if (!process.env.KNOWLEDGE_DATABASE_URL) {
  throw new Error('KNOWLEDGE_DATABASE_URL is required for knowledge retrieval and indexing');
}

const { PrismaClient } = require('../generated/knowledge-client');
module.exports = new PrismaClient();
