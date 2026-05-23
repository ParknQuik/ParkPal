#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { collectWarnings, openDatabase } = require('./query');

function needsRebuild() {
  let db;
  try {
    db = openDatabase();
    return collectWarnings(db).length > 0;
  } catch {
    return true;
  } finally {
    if (db) db.close();
  }
}

function main() {
  if (!needsRebuild()) {
    console.log('Knowledge DB is fresh; rebuild skipped.');
    return;
  }

  console.log('Knowledge DB is missing or stale; rebuilding.');
  execFileSync('npm', ['run', 'knowledge:build'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
}

main();
