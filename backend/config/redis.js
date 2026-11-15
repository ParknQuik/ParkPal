const { createClient } = require('redis');
const secretManager = require('./secretManager');

let redisClient;
let redisUrl;
let lastReconnectAttempt = 0;
let connectPromise;

async function initializeRedis() {
  try {
    // Get Redis URL from Secret Manager (or fallback to .env)
    redisUrl = redisUrl || await secretManager.getSecret('redis-url');

    if (!redisUrl) {
      console.warn('⚠️  REDIS_URL not configured - Redis features disabled');
      return null;
    }

    // Create client
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => retries < 1 ? 1000 : false,
      },
    });

    // Handle errors to prevent crashes, including errors during connect.
    redisClient.on('error', (err) => {
      console.warn('Redis error:', err.message);
    });

    await redisClient.connect();
    console.log('✅ Redis connected');

    return redisClient;
  } catch (err) {
    console.warn('⚠️  Redis unavailable (optional):', err.message);
    redisClient = null;
    return null;
  }
}

async function initializeOrRetry() {
  if (redisClient?.isOpen) return redisClient;
  if (!connectPromise && Date.now() - lastReconnectAttempt >= 5000) {
    lastReconnectAttempt = Date.now();
    connectPromise = initializeRedis().finally(() => { connectPromise = null; });
  }
  return connectPromise;
}

// Initialize immediately; auth can fall back locally while this is unavailable.
const clientPromise = initializeRedis().then(client => {
  redisClient = client;
  return client;
});

module.exports = new Proxy({}, {
  get: (target, prop) => async (...args) => {
    let client = redisClient || await clientPromise;
    if (!client?.isOpen) client = await initializeOrRetry();
    if (!client?.isOpen) throw new Error('Redis is unavailable');
    try {
      if (prop === 'incrementWithExpiry') {
        const [key, windowSeconds] = args;
        const results = await client.multi().incr(key).expire(key, windowSeconds, 'NX').exec();
        return Number(results[0]);
      }
      if (typeof client[prop] !== 'function') throw new Error(`Unsupported Redis operation: ${String(prop)}`);
      return client[prop](...args);
    } catch (error) {
      if (redisClient === client) redisClient = null;
      throw error;
    }
  }
});
