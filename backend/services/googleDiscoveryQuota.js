const crypto = require('crypto');
const redis = require('../config/redis');
const { ApiError } = require('../middleware/errorHandler');

// Atomic across instances. Failed provider calls consume their reservation.
const RESERVE_SCRIPT = [
  "if redis.call('EXISTS', KEYS[2]) == 1 then return -1 end",
  "local count = tonumber(redis.call('GET', KEYS[1]) or '0')",
  "if count >= 100 then return -2 end",
  "redis.call('INCR', KEYS[1])",
  "redis.call('EXPIRE', KEYS[1], ARGV[1])",
  "redis.call('SET', KEYS[2], '1', 'EX', 60)",
  "return count + 1",
].join('\n');
async function reserve(identity, now = new Date()) {
  const deployment = process.env.GOOGLE_DISCOVERY_DEPLOYMENT || process.env.K_SERVICE || 'parkpal';
  const prefix = 'google-discovery:{' + deployment + '}';
  const day = now.toISOString().slice(0, 10);
  const ttl = Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000);
  const actor = crypto.createHash('sha256').update(String(identity)).digest('hex');
  let result;
  try {
    result = Number(await redis.eval(RESERVE_SCRIPT, { keys: [prefix + ':day:' + day, prefix + ':actor:' + actor], arguments: [String(ttl)] }));
  } catch {
    throw new ApiError(503, 'Paid facility discovery is temporarily unavailable. Local parking remains available.');
  }
  if (result === -1) throw new ApiError(429, 'Wait one minute before finding more facilities');
  if (result === -2) throw new ApiError(429, 'Daily facility discovery budget reached');
  if (!Number.isInteger(result) || result < 1 || result > 100) throw new ApiError(503, 'Paid facility discovery is unavailable');
  return result;
}
module.exports = { reserve, RESERVE_SCRIPT };
