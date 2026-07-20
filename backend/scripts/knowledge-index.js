#!/usr/bin/env node
require('dotenv').config();
const { parseArgs, indexKnowledge } = require('../services/knowledge/indexer');

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const summary = await indexKnowledge(args);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failedCount > 0) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
