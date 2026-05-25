const prisma = require('../config/prisma');
const logger = require('../config/logger');
const {
  DEFAULT_METRO_MANILA_SCAN_POINTS,
  scanGoogleParkingCandidatesForPoints,
} = require('./parkingCandidateScanService');

const ADVISORY_LOCK_KEY = 724202605;
const DEFAULT_CRON = '0 3 * * 0';
const DEFAULT_MAX_PAGES = 1;
const MAX_GOOGLE_SCAN_PAGES = 3;

const isGoogleParkingScanEnabled = () => {
  return process.env.GOOGLE_PARKING_SCAN_ENABLED === 'true';
};

const getGoogleParkingScanCron = () => {
  return process.env.GOOGLE_PARKING_SCAN_CRON || DEFAULT_CRON;
};

const getGoogleParkingScanMaxPages = () => {
  const parsed = parseInt(process.env.GOOGLE_PARKING_SCAN_MAX_PAGES || DEFAULT_MAX_PAGES, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_PAGES;
  }

  return Math.min(parsed, MAX_GOOGLE_SCAN_PAGES);
};

const createScanRun = async (data) => {
  return prisma.parkingCandidateScanRun.create({
    data: {
      scanSource: 'google_places',
      trigger: data.trigger,
      status: data.status,
      scanPointCount: data.scanPointCount,
      requestCount: data.requestCount || 0,
      createdCount: data.createdCount || 0,
      updatedCount: data.updatedCount || 0,
      skippedCount: data.skippedCount || 0,
      errorSummary: data.errorSummary || null,
      completedAt: data.completedAt || null,
    },
  });
};

const updateScanRun = async (id, data) => {
  return prisma.parkingCandidateScanRun.update({
    where: { id },
    data,
  });
};

const acquireAdvisoryLock = async () => {
  const result = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS locked`;
  return Boolean(result?.[0]?.locked);
};

const releaseAdvisoryLock = async () => {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`;
};

const runScheduledGoogleParkingCandidateScan = async ({
  points = DEFAULT_METRO_MANILA_SCAN_POINTS,
  maxPages = getGoogleParkingScanMaxPages(),
  trigger = 'cron',
} = {}) => {
  const locked = await acquireAdvisoryLock();
  if (!locked) {
    const skippedRun = await createScanRun({
      trigger,
      status: 'skipped',
      scanPointCount: points.length,
      errorSummary: 'Another Google parking candidate scan is already running',
      completedAt: new Date(),
    });

    return {
      status: 'skipped',
      run: skippedRun,
      requestCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
    };
  }

  const run = await createScanRun({
    trigger,
    status: 'running',
    scanPointCount: points.length,
  });

  try {
    const result = await scanGoogleParkingCandidatesForPoints({ points, maxPages });
    const completedRun = await updateScanRun(run.id, {
      status: 'completed',
      requestCount: result.requestCount,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      completedAt: new Date(),
    });

    return {
      status: 'completed',
      run: completedRun,
      ...result,
    };
  } catch (error) {
    const failedRun = await updateScanRun(run.id, {
      status: 'failed',
      errorSummary: error.message,
      completedAt: new Date(),
    });

    throw Object.assign(error, { scanRun: failedRun });
  } finally {
    await releaseAdvisoryLock();
  }
};

const scheduleGoogleParkingCandidateScan = (cron) => {
  if (!isGoogleParkingScanEnabled()) {
    logger.info('Google parking candidate scan cron disabled');
    return null;
  }

  const schedule = getGoogleParkingScanCron();
  const task = cron.schedule(schedule, async () => {
    try {
      const result = await runScheduledGoogleParkingCandidateScan();
      logger.info('[Cron] Google parking candidate scan completed', {
        runId: result.run?.id,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        requestCount: result.requestCount,
      });
    } catch (error) {
      logger.error('[Cron] Google parking candidate scan failed:', error);
    }
  });

  logger.info(`Google parking candidate scan cron scheduled (${schedule})`);
  return task;
};

module.exports = {
  ADVISORY_LOCK_KEY,
  DEFAULT_CRON,
  getGoogleParkingScanCron,
  getGoogleParkingScanMaxPages,
  isGoogleParkingScanEnabled,
  runScheduledGoogleParkingCandidateScan,
  scheduleGoogleParkingCandidateScan,
};
