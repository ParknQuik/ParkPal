export const getCheckInAvailability = (
  booking: { status: string; rentalMode?: string; startTime: string; endTime?: string | null; maxDuration?: number | null },
  now: number = Date.now(),
) => {
  if (booking.status !== 'confirmed') return { available: false, message: '' };

  const start = new Date(booking.startTime).getTime();
  if (!Number.isFinite(start)) return { available: false, message: 'Check-in time unavailable' };
  const opens = start - 15 * 60 * 1000;
  if (now < opens) {
    const date = new Date(opens);
    return {
      available: false,
      message: `Check-in available ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    };
  }
  if (booking.rentalMode === 'fixed' && !booking.endTime) {
    return { available: false, message: 'Check-in end time unavailable' };
  }
  if (booking.rentalMode === 'fixed' && booking.endTime && now >= new Date(booking.endTime).getTime()) {
    return { available: false, message: 'Check-in window has ended' };
  }
  if (booking.rentalMode === 'open' && now > start + (booking.maxDuration || 4) * 60 * 60 * 1000) {
    return { available: false, message: 'Check-in window has ended' };
  }
  return { available: true, message: 'Check-in available now' };
};
