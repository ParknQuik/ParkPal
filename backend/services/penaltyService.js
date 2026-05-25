const prisma = require('../config/prisma');

const STRIKE_RESET_DAYS = 60;

const SUSPENSION_DURATIONS = {
  2: 24,      // 2nd strike → 24 hours
  3: 72,      // 3rd strike → 72 hours
  4: 168,     // 4th+ strike → 7 days
};

function getSuspensionHours(totalStrikes) {
  if (totalStrikes <= 1) return 0;
  return SUSPENSION_DURATIONS[Math.min(totalStrikes, 4)] ?? SUSPENSION_DURATIONS[4];
}

function buildStrikeMessage(strikeType, totalStrikes, suspendedUntil) {
  const strikeLabel = strikeType === 'no_show' ? 'no-show' : 'late cancellation';
  if (totalStrikes === 1) {
    return `Warning: You received a strike for a ${strikeLabel}. Repeated violations will result in booking suspensions.`;
  }
  const until = suspendedUntil.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  return `Strike ${totalStrikes}: Your account has been suspended until ${until} due to repeated ${strikeLabel}s.`;
}

async function applyStrike(userId, strikeType, bookingId, slotAddress) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { noShowCount: true, lateCancelCount: true, lastStrikeAt: true },
  });

  // Reset counts if last strike was more than STRIKE_RESET_DAYS ago
  const now = new Date();
  const shouldReset =
    user.lastStrikeAt &&
    now.getTime() - new Date(user.lastStrikeAt).getTime() > STRIKE_RESET_DAYS * 24 * 60 * 60 * 1000;

  const baseNoShow = shouldReset ? 0 : user.noShowCount;
  const baseLateCancel = shouldReset ? 0 : user.lateCancelCount;

  const newNoShow = strikeType === 'no_show' ? baseNoShow + 1 : baseNoShow;
  const newLateCancel = strikeType === 'late_cancel' ? baseLateCancel + 1 : baseLateCancel;
  const totalStrikes = newNoShow + newLateCancel;

  const suspensionHours = getSuspensionHours(totalStrikes);
  const suspendedUntil =
    suspensionHours > 0
      ? new Date(now.getTime() + suspensionHours * 60 * 60 * 1000)
      : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      noShowCount: newNoShow,
      lateCancelCount: newLateCancel,
      suspendedUntil: suspendedUntil,
      lastStrikeAt: now,
    },
  });

  const message = buildStrikeMessage(strikeType, totalStrikes, suspendedUntil ?? now);
  const title =
    totalStrikes === 1
      ? 'Strike Warning'
      : `Account Suspended — Strike ${totalStrikes}`;

  await prisma.notification.create({
    data: {
      userId,
      title,
      body: message,
      type: 'penalty_strike',
      data: JSON.stringify({
        bookingId,
        strikeType,
        totalStrikes,
        noShowCount: newNoShow,
        lateCancelCount: newLateCancel,
        suspendedUntil: suspendedUntil?.toISOString() ?? null,
      }),
    },
  });

  return { totalStrikes, suspendedUntil, suspensionHours };
}

async function checkSuspension(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspendedUntil: true },
  });
  if (!user) return null;
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    return user.suspendedUntil;
  }
  return null;
}

async function getBehaviorStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      noShowCount: true,
      lateCancelCount: true,
      suspendedUntil: true,
      lastStrikeAt: true,
    },
  });

  if (!user) return null;

  const totalStrikes = user.noShowCount + user.lateCancelCount;
  const isSuspended = Boolean(user.suspendedUntil && new Date(user.suspendedUntil) > new Date());

  return {
    noShowCount: user.noShowCount,
    lateCancelCount: user.lateCancelCount,
    totalStrikes,
    isSuspended,
    suspendedUntil: user.suspendedUntil,
    lastStrikeAt: user.lastStrikeAt,
    strikeResetDays: STRIKE_RESET_DAYS,
    policySummary: {
      warning: 'First strike is a warning.',
      suspension: 'Second and later strikes temporarily pause booking access.',
      noShow: 'No-shows and missed open-time check-ins count as no-show strikes.',
      lateCancellation: 'Cancellations within 1 hour of start count as late-cancellation strikes.',
      reset: `Strikes reset after ${STRIKE_RESET_DAYS} days without another strike.`,
    },
  };
}

module.exports = { applyStrike, checkSuspension, getBehaviorStatus, STRIKE_RESET_DAYS };
