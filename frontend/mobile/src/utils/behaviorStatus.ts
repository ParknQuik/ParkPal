import { BehaviorStatus } from '../types';

export type BehaviorStanding = 'good' | 'warning' | 'suspended';

export function getBehaviorStanding(status: BehaviorStatus | null): BehaviorStanding {
  if (status?.isSuspended) return 'suspended';
  if ((status?.totalStrikes || 0) > 0) return 'warning';
  return 'good';
}

export function formatSuspensionTime(value?: string | null): string {
  if (!value) return 'the listed time';

  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getBehaviorStatusLabel(status: BehaviorStatus | null): string {
  const standing = getBehaviorStanding(status);
  if (standing === 'suspended') return 'Booking paused';
  if (standing === 'warning') return 'Warning';
  return 'Good standing';
}

export function getBehaviorStatusMessage(status: BehaviorStatus | null): string {
  const totalStrikes = status?.totalStrikes || 0;

  if (status?.isSuspended) {
    return `Booking access is paused until ${formatSuspensionTime(status.suspendedUntil)}.`;
  }

  if (totalStrikes > 0) {
    return `${totalStrikes} strike${totalStrikes === 1 ? '' : 's'} on record. Cancel early and check in on time to avoid booking pauses.`;
  }

  return 'No renter strikes on your account.';
}

export function isAccountSuspendedError(error: any): boolean {
  return error?.response?.status === 403 && error?.response?.data?.code === 'ACCOUNT_SUSPENDED';
}

export function getSuspensionAlertMessage(error: any): string {
  const suspendedUntil = error?.response?.data?.suspendedUntil;
  return `Booking is paused until ${formatSuspensionTime(suspendedUntil)}.`;
}
