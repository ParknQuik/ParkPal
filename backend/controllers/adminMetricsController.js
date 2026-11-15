const prisma = require('../config/prisma');
const redisClient = require('../config/redis');
const secretManager = require('../config/secretManager');
const metrics = require('../config/metrics');
const { asyncHandler } = require('../middleware/errorHandler');

const PERIODS = { '24h': 24, '7d': 7 * 24, '30d': 30 * 24 };

function metricValues(metric) {
  return Array.isArray(metric?.values) ? metric.values : [];
}

function sumValues(values) {
  return values.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
}

function summarizeRuntime(registryMetrics) {
  const requestMetric = registryMetrics.find((metric) => metric.name === 'parkpal_http_requests_total');
  const requestValues = metricValues(requestMetric);
  const requests = sumValues(requestValues);
  const clientErrors = sumValues(requestValues.filter((item) => Number(item.labels?.status_code) >= 400 && Number(item.labels?.status_code) < 500));
  const serverErrors = sumValues(requestValues.filter((item) => Number(item.labels?.status_code) >= 500));

  const latencyMetric = registryMetrics.find((metric) => metric.name === 'parkpal_http_request_duration_seconds');
  const latencyValues = metricValues(latencyMetric);
  const totalSeconds = sumValues(latencyValues.filter((item) => item.metricName?.endsWith('_sum')));
  const observationCount = sumValues(latencyValues.filter((item) => item.metricName?.endsWith('_count')));
  const memory = process.memoryUsage();

  return {
    scope: 'current process since restart',
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
    },
    http: {
      requests,
      clientErrors,
      serverErrors,
      serverErrorRatePercent: requests ? Number(((serverErrors / requests) * 100).toFixed(2)) : 0,
      averageLatencyMs: observationCount ? Number(((totalSeconds / observationCount) * 1000).toFixed(1)) : null,
      latencyObservations: observationCount,
    },
  };
}

async function dependencyHealth() {
  const [database, redis] = await Promise.all([
    prisma.$queryRaw`SELECT 1`
      .then(() => ({ status: 'up' }))
      .catch(() => ({ status: 'down' })),
    redisClient.ping()
      .then(() => ({ status: 'up' }))
      .catch(() => ({ status: 'unavailable' })),
  ]);
  const secretStore = { status: secretManager.isInitialized ? 'configured' : 'not configured' };

  return {
    status: database.status === 'up' ? 'operational' : 'degraded',
    checkedAt: new Date().toISOString(),
    dependencies: { database, redis, secretManager: secretStore },
  };
}

function periodBounds(period, now = new Date()) {
  const durationMs = PERIODS[period] * 60 * 60 * 1000;
  const currentFrom = new Date(now.getTime() - durationMs);
  const previousFrom = new Date(currentFrom.getTime() - durationMs);
  return { currentFrom, currentTo: now, previousFrom, previousTo: currentFrom };
}

async function aggregateProductMetrics(bounds) {
  const currentRange = { gte: bounds.currentFrom, lt: bounds.currentTo };
  const previousRange = { gte: bounds.previousFrom, lt: bounds.previousTo };
  const currentBookingWhere = { createdAt: currentRange };
  const previousBookingWhere = { createdAt: previousRange };
  // Payments are counted in the period they entered their completed state (updatedAt),
  // rather than the potentially earlier time a pending payment record was created.
  const currentPaymentsWhere = { status: 'completed', currency: 'PHP', updatedAt: currentRange };
  const previousPaymentsWhere = { status: 'completed', currency: 'PHP', updatedAt: previousRange };

  const [newUsers, previousUsers, bookings, previousBookings, payments, previousPayments,
    activeOwnerListed, newOwnerListings, previousOwnerListings, commercialZones,
    zoneMetrics, webVitals] = await Promise.all([
    prisma.user.count({ where: { createdAt: currentRange } }),
    prisma.user.count({ where: { createdAt: previousRange } }),
    prisma.booking.groupBy({ by: ['status'], where: currentBookingWhere, _count: { _all: true } }),
    prisma.booking.groupBy({ by: ['status'], where: previousBookingWhere, _count: { _all: true } }),
    prisma.payment.aggregate({ where: currentPaymentsWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: previousPaymentsWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.parkingSlot.count({ where: { isActive: true, ownerId: { not: null } } }),
    prisma.parkingSlot.count({ where: { isActive: true, ownerId: { not: null }, createdAt: currentRange } }),
    prisma.parkingSlot.count({ where: { isActive: true, ownerId: { not: null }, createdAt: previousRange } }),
    prisma.zone.count({ where: { isActive: true, type: 'commercial' } }),
    prisma.zoneMetrics.aggregate({
      where: { timestamp: currentRange },
      _avg: { occupancyPercentage: true },
      _count: { _all: true },
    }),
    prisma.webPerformanceMetric.groupBy({
      by: ['name'],
      where: { recordedAt: currentRange },
      _avg: { value: true },
      _count: { _all: true },
    }),
  ]);

  const statusMap = (items) => Object.fromEntries(items.map((item) => [item.status, item._count._all]));
  const ratingCounts = await prisma.webPerformanceMetric.groupBy({
    by: ['name', 'rating'],
    where: { recordedAt: currentRange },
    _count: { _all: true },
  });

  return {
    users: { current: newUsers, previous: previousUsers },
    bookings: {
      current: statusMap(bookings),
      previous: statusMap(previousBookings),
    },
    completedPaymentsPhp: {
      current: Number(payments._sum.amount || 0),
      previous: Number(previousPayments._sum.amount || 0),
      currentCount: payments._count._all,
      previousCount: previousPayments._count._all,
    },
    supply: {
      activeOwnerListedSpaces: activeOwnerListed,
      newActiveOwnerListedSpaces: { current: newOwnerListings, previous: previousOwnerListings },
      activeCommercialZones: commercialZones,
    },
    zoneAnalytics: {
      averageReportedOccupancyPercent: zoneMetrics._avg.occupancyPercentage === null
        ? null : Number(zoneMetrics._avg.occupancyPercentage.toFixed(1)),
      samples: zoneMetrics._count._all,
      note: 'Reported zone analytics; not live availability or a reservation guarantee.',
    },
    webVitals: webVitals.map((item) => ({
      name: item.name,
      average: item._avg.value === null ? null : Number(item._avg.value.toFixed(2)),
      samples: item._count._all,
      ratings: Object.fromEntries(ratingCounts
        .filter((rating) => rating.name === item.name)
        .map((rating) => [rating.rating, rating._count._all])),
    })),
  };
}

exports.getDashboardMetrics = asyncHandler(async (req, res) => {
  const period = req.query.period || '24h';
  if (!Object.prototype.hasOwnProperty.call(PERIODS, period)) {
    return res.status(400).json({ error: 'period must be one of: 24h, 7d, 30d' });
  }

  const bounds = periodBounds(period);
  const [product, health, registryMetrics] = await Promise.all([
    aggregateProductMetrics(bounds),
    dependencyHealth(),
    Promise.resolve().then(() => metrics.register.getMetricsAsJSON()).catch(() => []),
  ]);
  res.json({
    period,
    range: {
      currentFrom: bounds.currentFrom.toISOString(),
      currentTo: bounds.currentTo.toISOString(),
      previousFrom: bounds.previousFrom.toISOString(),
      previousTo: bounds.previousTo.toISOString(),
    },
    product,
    engineering: { ...health, runtime: summarizeRuntime(registryMetrics) },
    generatedAt: new Date().toISOString(),
  });
});

exports.summarizeRuntime = summarizeRuntime;
exports.periodBounds = periodBounds;
exports.aggregateProductMetrics = aggregateProductMetrics;
