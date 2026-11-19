const FIFTEEN_MINUTES = 15 * 60 * 1000;

function fixedCheckInError(booking, now = new Date()) {
  const opens = new Date(booking.startTime).getTime() - FIFTEEN_MINUTES;
  if (now.getTime() < opens) {
    return 'Check-in is available 15 minutes before your booking starts.';
  }
  if (now.getTime() >= new Date(booking.endTime).getTime()) {
    return 'Your booking has ended. Check-in is no longer available.';
  }
  return null;
}

module.exports = { fixedCheckInError };
