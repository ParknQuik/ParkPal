jest.mock('../config/redis', () => ({ ping: jest.fn().mockResolvedValue('PONG') }));
jest.mock('../config/prisma', () => ({
  user: { count: jest.fn() },
  booking: { groupBy: jest.fn() },
  payment: { aggregate: jest.fn() },
  parkingSlot: { count: jest.fn() },
  zone: { count: jest.fn() },
  zoneMetrics: { aggregate: jest.fn() },
  webPerformanceMetric: { groupBy: jest.fn() },
}));

const prisma = require('../config/prisma');
const { summarizeRuntime, periodBounds, aggregateProductMetrics } = require('../controllers/adminMetricsController');

describe('admin metrics helpers', () => {
  test('summarizes current-process request errors and average latency', () => {
    const result = summarizeRuntime([
      {
        name: 'parkpal_http_requests_total',
        values: [
          { labels: { status_code: '200' }, value: 6 },
          { labels: { status_code: '404' }, value: 1 },
          { labels: { status_code: '503' }, value: 2 },
        ],
      },
      {
        name: 'parkpal_http_request_duration_seconds',
        values: [
          { metricName: 'parkpal_http_request_duration_seconds_sum', value: 4.5 },
          { metricName: 'parkpal_http_request_duration_seconds_count', value: 3 },
        ],
      },
    ]);

    expect(result.scope).toBe('current process since restart');
    expect(result.http).toMatchObject({
      requests: 9,
      clientErrors: 1,
      serverErrors: 2,
      serverErrorRatePercent: 22.22,
      averageLatencyMs: 1500,
      latencyObservations: 3,
    });
  });

  test('creates equal adjacent windows for supported periods', () => {
    const now = new Date('2026-11-13T00:00:00.000Z');
    const bounds = periodBounds('24h', now);
    expect(bounds.currentFrom.toISOString()).toBe('2026-11-12T00:00:00.000Z');
    expect(bounds.currentTo.toISOString()).toBe('2026-11-13T00:00:00.000Z');
    expect(bounds.previousFrom.toISOString()).toBe('2026-11-11T00:00:00.000Z');
    expect(bounds.previousTo.toISOString()).toBe('2026-11-12T00:00:00.000Z');
  });

  test('aggregates product metrics from database ranges and separates commercial supply', async () => {
    prisma.user.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    prisma.booking.groupBy.mockResolvedValueOnce([
      { status: 'pending', _count: { _all: 1 } },
      { status: 'completed', _count: { _all: 2 } },
    ]).mockResolvedValueOnce([{ status: 'completed', _count: { _all: 1 } }]);
    prisma.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: 1200 }, _count: { _all: 2 } })
      .mockResolvedValueOnce({ _sum: { amount: 500 }, _count: { _all: 1 } });
    prisma.parkingSlot.count.mockResolvedValueOnce(9).mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.zone.count.mockResolvedValue(4);
    prisma.zoneMetrics.aggregate.mockResolvedValue({ _avg: { occupancyPercentage: 35.25 }, _count: { _all: 8 } });
    prisma.webPerformanceMetric.groupBy.mockResolvedValueOnce([{ name: 'LCP', _avg: { value: 2100 }, _count: { _all: 5 } }])
      .mockResolvedValueOnce([
        { name: 'LCP', rating: 'good', _count: { _all: 3 } },
        { name: 'LCP', rating: 'poor', _count: { _all: 2 } },
      ]);

    const result = await aggregateProductMetrics({
      currentFrom: new Date('2026-11-12T00:00:00Z'),
      currentTo: new Date('2026-11-13T00:00:00Z'),
      previousFrom: new Date('2026-11-11T00:00:00Z'),
      previousTo: new Date('2026-11-12T00:00:00Z'),
    });

    expect(result).toMatchObject({
      users: { current: 3, previous: 2 },
      bookings: { current: { pending: 1, completed: 2 }, previous: { completed: 1 } },
      completedPaymentsPhp: { current: 1200, previous: 500, currentCount: 2, previousCount: 1 },
      supply: { activeOwnerListedSpaces: 9, newActiveOwnerListedSpaces: { current: 2, previous: 1 }, activeCommercialZones: 4 },
      zoneAnalytics: { averageReportedOccupancyPercent: 35.3, samples: 8 },
      webVitals: [{ name: 'LCP', average: 2100, samples: 5, ratings: { good: 3, poor: 2 } }],
    });
    expect(prisma.payment.aggregate.mock.calls[0][0].where).toMatchObject({ status: 'completed', currency: 'PHP', updatedAt: expect.any(Object) });
    expect(prisma.parkingSlot.count.mock.calls[0][0].where).toMatchObject({ isActive: true, ownerId: { not: null } });
  });
});
