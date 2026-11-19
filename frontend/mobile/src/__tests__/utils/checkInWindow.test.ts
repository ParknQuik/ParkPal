import { getCheckInAvailability } from '../../utils/checkInWindow';

const booking = { status: 'confirmed', rentalMode: 'fixed', startTime: '2026-11-20T10:00:00.000Z', endTime: '2026-11-20T12:00:00.000Z' };

it('updates eligibility at the fixed booking boundaries', () => {
  expect(getCheckInAvailability(booking, Date.parse('2026-11-20T09:44:59.999Z')).available).toBe(false);
  expect(getCheckInAvailability(booking, Date.parse('2026-11-20T09:45:00.000Z')).available).toBe(true);
  expect(getCheckInAvailability(booking, Date.parse('2026-11-20T11:00:00.000Z')).available).toBe(true);
  expect(getCheckInAvailability(booking, Date.parse('2026-11-20T12:00:00.000Z')).available).toBe(false);
  expect(getCheckInAvailability({ ...booking, status: 'pending' }, Date.parse('2026-11-20T11:00:00.000Z')).available).toBe(false);
  expect(getCheckInAvailability({ ...booking, rentalMode: 'open', maxDuration: 4 }, Date.parse('2026-11-20T14:00:00.001Z')).available).toBe(false);
});
