const mockPrisma = {
  $queryRaw: jest.fn(),
  parkingCandidateScanRun: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../config/prisma', () => mockPrisma);
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../services/parkingCandidateScanService', () => ({
  DEFAULT_METRO_MANILA_SCAN_POINTS: [
    { label: 'Makati CBD', lat: 14.5547, lon: 121.0244, radius: 2500, type: 'parking' },
  ],
  scanGoogleParkingCandidatesForPoints: jest.fn(),
}));

const scanService = require('../services/parkingCandidateScanService');
const scheduler = require('../services/parkingCandidateScanScheduler');

describe('parking candidate scan scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GOOGLE_PARKING_SCAN_ENABLED;
    delete process.env.GOOGLE_PARKING_SCAN_CRON;
    delete process.env.GOOGLE_PARKING_SCAN_MAX_PAGES;
  });

  it('records a completed advisory-locked scheduled scan', async () => {
    const runningRun = { id: 7, status: 'running' };
    const completedRun = { id: 7, status: 'completed' };

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ pg_advisory_unlock: true }]);
    mockPrisma.parkingCandidateScanRun.create.mockResolvedValue(runningRun);
    mockPrisma.parkingCandidateScanRun.update.mockResolvedValue(completedRun);
    scanService.scanGoogleParkingCandidatesForPoints.mockResolvedValue({
      candidates: [{ id: 1 }],
      requestCount: 1,
      createdCount: 1,
      updatedCount: 0,
      skippedCount: 0,
    });

    const result = await scheduler.runScheduledGoogleParkingCandidateScan({
      points: [{ label: 'Test CBD', lat: 14.6, lon: 120.98, radius: 1000, type: 'parking' }],
      maxPages: 1,
      trigger: 'test',
    });

    expect(result.status).toBe('completed');
    expect(mockPrisma.parkingCandidateScanRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scanSource: 'google_places',
        trigger: 'test',
        status: 'running',
        scanPointCount: 1,
      }),
    });
    expect(scanService.scanGoogleParkingCandidatesForPoints).toHaveBeenCalledWith({
      points: [{ label: 'Test CBD', lat: 14.6, lon: 120.98, radius: 1000, type: 'parking' }],
      maxPages: 1,
    });
    expect(mockPrisma.parkingCandidateScanRun.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        status: 'completed',
        requestCount: 1,
        createdCount: 1,
        updatedCount: 0,
        skippedCount: 0,
      }),
    });
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(result.run).toEqual(completedRun);
  });

  it('records skipped when another instance holds the advisory lock', async () => {
    const skippedRun = { id: 8, status: 'skipped' };

    mockPrisma.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
    mockPrisma.parkingCandidateScanRun.create.mockResolvedValue(skippedRun);

    const result = await scheduler.runScheduledGoogleParkingCandidateScan({
      points: [{ label: 'Test CBD', lat: 14.6, lon: 120.98, radius: 1000, type: 'parking' }],
      maxPages: 1,
      trigger: 'test',
    });

    expect(result.status).toBe('skipped');
    expect(scanService.scanGoogleParkingCandidatesForPoints).not.toHaveBeenCalled();
    expect(mockPrisma.parkingCandidateScanRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'skipped',
        errorSummary: 'Another Google parking candidate scan is already running',
      }),
    });
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('does not schedule cron unless enabled', () => {
    const cron = { schedule: jest.fn() };

    const task = scheduler.scheduleGoogleParkingCandidateScan(cron);

    expect(task).toBeNull();
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('clamps configured max pages to the Google scan service limit', () => {
    process.env.GOOGLE_PARKING_SCAN_MAX_PAGES = '10';

    expect(scheduler.getGoogleParkingScanMaxPages()).toBe(3);
  });

  it('schedules cron when enabled with configured timing', () => {
    const cronTask = { stop: jest.fn() };
    const cron = { schedule: jest.fn().mockReturnValue(cronTask) };
    process.env.GOOGLE_PARKING_SCAN_ENABLED = 'true';
    process.env.GOOGLE_PARKING_SCAN_CRON = '0 4 * * 1';

    const task = scheduler.scheduleGoogleParkingCandidateScan(cron);

    expect(task).toBe(cronTask);
    expect(cron.schedule).toHaveBeenCalledWith('0 4 * * 1', expect.any(Function));
  });
});
