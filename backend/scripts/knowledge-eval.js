#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const redisClient = require('../config/redis');
const { retrieve } = require('../services/knowledge/retrieval');

const defaultDataset = path.resolve(__dirname, '../docs/knowledge-eval.json');
const datasetPath = process.argv.includes('--dataset')
  ? path.resolve(process.cwd(), process.argv[process.argv.indexOf('--dataset') + 1])
  : defaultDataset;

function mrr(results, expectedPath) {
  const rank = results.findIndex((citation) => citation.path === expectedPath);
  return rank === -1 ? 0 : 1 / (rank + 1);
}

function evaluateResult(item, result) {
  const topCitation = result.citations[0]?.path || null;
  const expectedPath = item.expectedPath || null;
  const expectedNoAnswer = Boolean(item.expectedNoAnswer);
  const paths = result.citations.map((citation) => citation.path);
  const passed = expectedNoAnswer
    ? !result.answerable
    : Boolean(expectedPath && paths.includes(expectedPath));

  return {
    query: item.query,
    expectedPath,
    expectedNoAnswer,
    topCitation,
    answerable: Boolean(result.answerable),
    confidence: Number((result.confidence || 0).toFixed(4)),
    contextTokenCount: result.contextTokenCount || 0,
    passed,
  };
}

async function closeResources() {
  await Promise.allSettled([
    prisma.$disconnect?.(),
    redisClient.quit?.(),
  ]);
}

async function runEvaluation(dataset) {
  let recall = 0;
  let reciprocalRank = 0;
  let noAnswerCorrect = 0;
  let tokenTotal = 0;
  let expectedPathCount = 0;
  let noAnswerCount = 0;
  const rows = [];

  for (const item of dataset) {
    const result = await retrieve(item.query, { role: item.role || 'user' });
    const row = evaluateResult(item, result);
    rows.push(row);

    if (item.expectedNoAnswer) {
      noAnswerCount += 1;
      if (!result.answerable) noAnswerCorrect += 1;
    } else if (item.expectedPath) {
      expectedPathCount += 1;
      if (row.passed) recall += 1;
      reciprocalRank += mrr(result.citations, item.expectedPath);
    }
    tokenTotal += result.contextTokenCount || 0;
  }

  const count = dataset.length || 1;
  return {
    count: dataset.length,
    expectedPathCount,
    expectedPathCorrect: recall,
    noAnswerCount,
    noAnswerCorrect,
    passedCount: rows.filter((row) => row.passed).length,
    recallAtK: expectedPathCount ? recall / expectedPathCount : null,
    mrr: expectedPathCount ? reciprocalRank / expectedPathCount : null,
    noAnswerAccuracy: noAnswerCount ? noAnswerCorrect / noAnswerCount : null,
    averageRetrievedTokenCount: tokenTotal / count,
    rows,
  };
}

async function main() {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const summary = await runEvaluation(dataset);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.passedCount < summary.count) process.exitCode = 1;
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(closeResources);
}

module.exports = {
  evaluateResult,
  runEvaluation,
  closeResources,
};
