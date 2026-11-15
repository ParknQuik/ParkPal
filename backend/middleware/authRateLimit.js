const crypto = require('crypto');
const redis = require('../config/redis');
const secretManager = require('../config/secretManager');
const logger = require('../config/logger');

const localCounters = new Map();
let redisDegraded = false;
let hmacSecretPromise;

async function getHmacSecret() {
  if (!hmacSecretPromise) {
    hmacSecretPromise = secretManager.getSecret('jwt-secret').then((secret) => {
      if (!secret) throw new Error('JWT secret unavailable for rate-limit key hashing');
      return secret;
    }).catch((error) => {
      hmacSecretPromise = null;
      throw error;
    });
  }
  return hmacSecretPromise;
}

function accountDigest(value, secret) {
  return crypto.createHmac('sha256', secret).update(String(value).trim().toLowerCase()).digest('hex');
}

function localIncrement(key, windowMs) {
  const now = Date.now();
  let entry = localCounters.get(key);
  if (!entry || entry.expiresAt <= now) {
    entry = { count: 0, expiresAt: now + windowMs };
    localCounters.set(key, entry);
  }
  entry.count += 1;
  return entry.count;
}

function windowKey(key, windowMs) {
  return `${key}:${Math.floor(Date.now() / windowMs)}`;
}

function windowResetAt(windowMs) {
  return (Math.floor(Date.now() / windowMs) + 1) * windowMs;
}

async function increment(key, windowMs) {
  const storeKey = windowKey(key, windowMs);
  try {
    const count = await redis.incrementWithExpiry(`auth-rate:${storeKey}`, Math.ceil(windowMs / 1000));
    if (redisDegraded) logger.info('Authentication rate limiting recovered to Redis');
    redisDegraded = false;
    return count;
  } catch (error) {
    if (!redisDegraded) logger.warn('Authentication rate limiting using per-instance fallback', { error: error.message });
    redisDegraded = true;
    return localIncrement(storeKey, windowMs);
  }
}

async function currentCount(key, windowMs) {
  try {
    const storeKey = windowKey(key, windowMs);
    const value = await redis.get(`auth-rate:${storeKey}`);
    if (redisDegraded) logger.info('Authentication rate limiting recovered to Redis');
    redisDegraded = false;
    return Number(value || 0);
  } catch (error) {
    if (!redisDegraded) logger.warn('Authentication rate limiting using per-instance fallback', { error: error.message });
    redisDegraded = true;
    const entry = localCounters.get(windowKey(key, windowMs));
    return entry && entry.expiresAt > Date.now() ? entry.count : 0;
  }
}

function setRateHeaders(res, limit, remaining, resetAt, windowMs) {
  res.set('RateLimit-Policy', `${limit};w=${Math.ceil(windowMs / 1000)}`);
  res.set('RateLimit-Limit', String(limit));
  res.set('RateLimit-Remaining', String(Math.max(0, remaining)));
  res.set('RateLimit-Reset', String(Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))));
}

function reject(res, limit, resetAt, message, windowMs) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  setRateHeaders(res, limit, 0, resetAt, windowMs);
  res.set('Retry-After', String(retryAfter));
  return res.status(429).json({ error: message, retryAfter });
}

const policies = {
  login: { key: 'login:ip', max: 30, windowMs: 15 * 60_000, countOn: 'failure' },
  registerAttempts: { key: 'register:attempt:ip', max: 30, windowMs: 15 * 60_000, countOn: 'all' },
  registerSuccess: { key: 'register:success:ip', max: 10, windowMs: 60 * 60_000, countOn: 'success' },
  reset: { key: 'reset:ip', max: 10, windowMs: 60 * 60_000, countOn: 'all' },
  resetAccount: { key: 'reset:account', max: 3, windowMs: 60 * 60_000, countOn: 'all' },
};

function authRateLimit(kind) {
  const policy = policies[kind === 'register' ? 'registerAttempts' : kind];
  if (!policy) throw new Error(`Unknown auth rate-limit policy: ${kind}`);
  if (process.env.NODE_ENV === 'test') return (req, res, next) => next();

  return async (req, res, next) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const getKey = async () => {
        if (policy.key.includes('account')) {
          const email = req.body?.email;
          if (!email) return null;
          try {
            return `${policy.key}:${accountDigest(email, await getHmacSecret())}`;
          } catch (error) {
            logger.warn('Account rate-limit key unavailable; applying IP policy only', { error: error.message });
            return null;
          }
        }
        return `${policy.key}:${ip}`;
      };
      const key = await getKey();

      const counters = [];
      if (key) counters.push({ key, policy });
      if (kind === 'register') counters.push({ key: `register:success:ip:${ip}`, policy: policies.registerSuccess });
      if (kind === 'reset') counters.push({ key: await (async () => {
        const email = req.body?.email;
        if (!email) return null;
        try { return `reset:account:${accountDigest(email, await getHmacSecret())}`; }
        catch (error) {
          logger.warn('Account rate-limit key unavailable; applying IP policy only', { error: error.message });
          return null;
        }
      })(), policy: policies.resetAccount });

      for (const counter of counters) {
        if (!counter.key) continue;
        const reserveNow = counter.policy.countOn === 'all';
        const current = reserveNow
          ? await increment(counter.key, counter.policy.windowMs)
          : await currentCount(counter.key, counter.policy.windowMs);
        const overLimit = reserveNow
          ? current > counter.policy.max
          : (counter.policy.countOn === 'failure' || counter.policy.countOn === 'success')
            ? current >= counter.policy.max
            : current > counter.policy.max;
        if (overLimit) {
          return reject(res, counter.policy.max, windowResetAt(counter.policy.windowMs), 'Too many requests. Please try again later.', counter.policy.windowMs);
        }
        setRateHeaders(res, counter.policy.max, counter.policy.max - current, windowResetAt(counter.policy.windowMs), counter.policy.windowMs);
      }

      if (kind === 'login' && key && req.body?.email) {
        try {
          const accountKey = `login:account:${accountDigest(req.body.email, await getHmacSecret())}`;
          const failures = await currentCount(accountKey, 15 * 60_000);
          const delayMs = Math.min(30_000, 500 * (2 ** Math.min(Math.max(failures - 1, 0), 6)));
          if (failures > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        } catch (error) {
          logger.warn('Account delay unavailable; applying IP policy only', { error: error.message });
        }
      }

      res.once('finish', async () => {
        const successful = kind === 'login' ? res.statusCode !== 401 : res.statusCode < 400;
        for (const counter of counters) {
          if (!counter.key) continue;
          const shouldCount = (counter.policy.countOn === 'failure' && !successful) ||
            (counter.policy.countOn === 'success' && successful);
          if (!shouldCount) continue;
          // Login's IP policy counts only failed authentication; registration attempt
          // and reset policies count requests, while account creation has its own bucket.
          await increment(counter.key, counter.policy.windowMs);
        }
        if (kind === 'login' && res.statusCode === 401 && req.body?.email) {
          try {
            const digest = accountDigest(req.body.email, await getHmacSecret());
            const accountKey = `login:account:${digest}`;
            await increment(accountKey, 15 * 60_000);
          } catch (error) {
            logger.warn('Could not apply account authentication delay', { error: error.message });
          }
        }
      });
      next();
    } catch (error) {
      logger.warn('Authentication rate-limit check failed; allowing request', { error: error.message });
      next();
    }
  };
}

module.exports = { authRateLimit };
