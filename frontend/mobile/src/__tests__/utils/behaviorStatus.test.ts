import {
  getBehaviorStanding,
  getBehaviorStatusLabel,
  getBehaviorStatusMessage,
} from '../../utils/behaviorStatus';
import { BehaviorStatus } from '../../types';

const createStatus = (overrides: Partial<BehaviorStatus> = {}): BehaviorStatus => ({
  noShowCount: 0,
  lateCancelCount: 0,
  totalStrikes: 0,
  isSuspended: false,
  suspendedUntil: null,
  lastStrikeAt: null,
  strikeResetDays: 60,
  policySummary: {
    warning: 'First strike is a warning.',
    suspension: 'Second and later strikes temporarily pause booking access.',
    noShow: 'No-shows and missed open-time check-ins count as no-show strikes.',
    lateCancellation: 'Cancellations within 1 hour of start count as late-cancellation strikes.',
    reset: 'Strikes reset after 60 days without another strike.',
  },
  ...overrides,
});

describe('behavior status mapping', () => {
  it('maps no strikes to good standing', () => {
    const status = createStatus();

    expect(getBehaviorStanding(status)).toBe('good');
    expect(getBehaviorStatusLabel(status)).toBe('Good standing');
    expect(getBehaviorStatusMessage(status)).toBe('No renter strikes on your account.');
  });

  it('maps strikes without suspension to warning', () => {
    const status = createStatus({
      noShowCount: 1,
      totalStrikes: 1,
      lastStrikeAt: new Date().toISOString(),
    });

    expect(getBehaviorStanding(status)).toBe('warning');
    expect(getBehaviorStatusLabel(status)).toBe('Warning');
    expect(getBehaviorStatusMessage(status)).toContain('1 strike on record');
  });

  it('maps active suspension to suspended', () => {
    const status = createStatus({
      noShowCount: 1,
      lateCancelCount: 1,
      totalStrikes: 2,
      isSuspended: true,
      suspendedUntil: '2026-05-24T12:00:00.000Z',
    });

    expect(getBehaviorStanding(status)).toBe('suspended');
    expect(getBehaviorStatusLabel(status)).toBe('Booking paused');
    expect(getBehaviorStatusMessage(status)).toContain('Booking access is paused until');
  });
});
