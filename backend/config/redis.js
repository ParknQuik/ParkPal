const { createClient } = require('redis');

// Create client but don't connect immediately
const redisClient = createClient({ url: process.env.REDIS_URL });

// Connect in background without blocking
redisClient.connect()
  .then(() => console.log('✅ Redis connected'))
  .catch((err) => console.warn('⚠️  Redis unavailable (optional):', err.message));

// Handle errors to prevent crashes
redisClient.on('error', (err) => {
  console.warn('Redis error:', err.message);
});

module.exports = redisClient;
