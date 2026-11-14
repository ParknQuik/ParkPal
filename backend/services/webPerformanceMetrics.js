const prisma = require('../config/prisma');

const RETENTION_DAYS = 90;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastPrunedAt = 0;

async function pruneWebPerformanceMetrics(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.webPerformanceMetric.deleteMany({ where: { recordedAt: { lt: cutoff } } });
  lastPrunedAt = now.getTime();
  return result;
}

async function recordWebPerformanceMetric({ name, value, rating }) {
  const metric = await prisma.webPerformanceMetric.create({
    data: { name, value, rating },
    select: { id: true },
  });

  // Also prune at most once per day on writes so scale-to-zero services still enforce retention.
  if (Date.now() - lastPrunedAt >= PRUNE_INTERVAL_MS) await pruneWebPerformanceMetrics();
  return metric;
}

module.exports = { RETENTION_DAYS, pruneWebPerformanceMetrics, recordWebPerformanceMetric };
