jest.mock('../config/prisma', () => ({
  webPerformanceMetric: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const prisma = require('../config/prisma');
const { pruneWebPerformanceMetrics, recordWebPerformanceMetric, RETENTION_DAYS } = require('../services/webPerformanceMetrics');

describe('web performance metric storage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('stores only the metric sample fields and prunes the 90-day window', async () => {
    prisma.webPerformanceMetric.create.mockResolvedValue({ id: 1 });
    prisma.webPerformanceMetric.deleteMany.mockResolvedValue({ count: 0 });

    await recordWebPerformanceMetric({ name: 'LCP', value: 1900, rating: 'good' });

    expect(prisma.webPerformanceMetric.create).toHaveBeenCalledWith({
      data: { name: 'LCP', value: 1900, rating: 'good' },
      select: { id: true },
    });
    expect(prisma.webPerformanceMetric.deleteMany).toHaveBeenCalledWith({
      where: { recordedAt: { lt: expect.any(Date) } },
    });
    expect(RETENTION_DAYS).toBe(90);
  });

  test('uses the supplied current time when pruning old rows', async () => {
    prisma.webPerformanceMetric.deleteMany.mockResolvedValue({ count: 2 });
    const now = new Date('2026-11-13T00:00:00.000Z');
    await pruneWebPerformanceMetrics(now);
    const cutoff = prisma.webPerformanceMetric.deleteMany.mock.calls[0][0].where.recordedAt.lt;
    expect(cutoff.toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });
});
