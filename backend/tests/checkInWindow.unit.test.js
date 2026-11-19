const { fixedCheckInError } = require('../services/checkInWindow');

describe('fixed booking check-in window', () => {
  const startTime = new Date('2026-11-20T10:00:00.000Z');
  const endTime = new Date('2026-11-20T12:00:00.000Z');
  const booking = { startTime, endTime };

  test.each([
    ['before opening', '2026-11-20T09:44:59.999Z', 'Check-in is available 15 minutes before your booking starts.'],
    ['at opening', '2026-11-20T09:45:00.000Z', null],
    ['during booking', '2026-11-20T11:00:00.000Z', null],
    ['just before end', '2026-11-20T11:59:59.999Z', null],
    ['at end', '2026-11-20T12:00:00.000Z', 'Your booking has ended. Check-in is no longer available.'],
    ['after end', '2026-11-20T12:00:00.001Z', 'Your booking has ended. Check-in is no longer available.'],
  ])('%s', (_label, now, expected) => {
    expect(fixedCheckInError(booking, new Date(now))).toBe(expected);
  });
});
