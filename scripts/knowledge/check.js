#!/usr/bin/env node

const { collectWarnings, formatWarnings, openDatabase } = require('./query');

function main() {
  let db;
  try {
    db = openDatabase();
    const warnings = collectWarnings(db);

    if (warnings.length === 0) {
      console.log('Knowledge DB is fresh.');
      return;
    }

    console.error('Knowledge DB is stale.');
    console.error(formatWarnings(warnings).join('\n').trimEnd());
    process.exitCode = 1;
  } catch (error) {
    console.error(`Knowledge DB check failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (db) db.close();
  }
}

main();
