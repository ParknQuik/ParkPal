const { createClient } = require('redis');
const secretManager = require('./secretManager');

let redisClient;

async function initializeRedis() {
  try {
    // Get Redis URL from Secret Manager (or fallback to .env)
    const redisUrl = await secretManager.getSecret('redis-url');

    if (!redisUrl) {
      console.warn('⚠️  REDIS_URL not configured - Redis features disabled');
      // Return a mock client that does nothing
      return {
        connect: async () => {},
        get: async () => null,
        set: async () => {},
        del: async () => {},
        on: () => {}
      };
    }

    // Create client
    redisClient = createClient({ url: redisUrl });

    // Connect in background without blocking
    await redisClient.connect();
    console.log('✅ Redis connected');

    // Handle errors to prevent crashes
    redisClient.on('error', (err) => {
      console.warn('Redis error:', err.message);
    });

    return redisClient;
  } catch (err) {
    console.warn('⚠️  Redis unavailable (optional):', err.message);
    // Return mock client
    return {
      connect: async () => {},
      get: async () => null,
      set: async () => {},
      del: async () => {},
      on: () => {}
    };
  }
}

// Initialize immediately
redisClient = null;
const clientPromise = initializeRedis().then(client => {
  redisClient = client;
  return client;
});

// Export a proxy that waits for initialization
module.exports = new Proxy({}, {
  get: (target, prop) => {
    if (redisClient) {
      return redisClient[prop];
    }
    // For operations, return async functions that wait for initialization
    return async (...args) => {
      const client = await clientPromise;
      if (typeof client[prop] === 'function') {
        return client[prop](...args);
      }
      return client[prop];
    };
  }
});
