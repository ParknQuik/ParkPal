const redisClient = require('../config/redis');

/**
 * Redis Caching Service
 * Provides a simple caching layer for frequently accessed data
 */

const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 900, // 15 minutes
  HOUR: 3600, // 1 hour
};

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached data or null if not found
 */
async function get(key) {
  try {
    const data = await redisClient.get(key);
    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.warn(`Cache get error for key ${key}:`, error.message);
    return null;
  }
}

/**
 * Set data in cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 */
async function set(key, value, ttl = CACHE_TTL.MEDIUM) {
  try {
    const data = JSON.stringify(value);
    await redisClient.setEx(key, ttl, data);
    return true;
  } catch (error) {
    console.warn(`Cache set error for key ${key}:`, error.message);
    return false;
  }
}

/**
 * Delete data from cache
 * @param {string} key - Cache key
 */
async function del(key) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.warn(`Cache delete error for key ${key}:`, error.message);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'listings:*')
 */
async function delPattern(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.warn(`Cache delete pattern error for ${pattern}:`, error.message);
    return false;
  }
}

/**
 * Wrapper for cache-aside pattern
 * Attempts to get from cache first, if not found, calls fetchFn and caches result
 *
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not in cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Data from cache or fetchFn
 */
async function getOrSet(key, fetchFn, ttl = CACHE_TTL.MEDIUM) {
  try {
    // Try to get from cache
    const cached = await get(key);
    if (cached !== null) {
      console.log(`Cache HIT: ${key}`);
      return cached;
    }

    console.log(`Cache MISS: ${key}`);

    // Not in cache, fetch data
    const data = await fetchFn();

    // Cache the result
    await set(key, data, ttl);

    return data;
  } catch (error) {
    console.error(`Cache getOrSet error for key ${key}:`, error.message);
    // On error, just return the data without caching
    return await fetchFn();
  }
}

/**
 * Generate cache key for marketplace listings
 * @param {Object} params - Search parameters
 * @returns {string} - Cache key
 */
function getListingsCacheKey(params) {
  const {
    lat,
    lon,
    radius,
    minPrice,
    maxPrice,
    amenities,
    slotType,
    status,
    offset,
    limit,
    sort,
  } = params;

  // Create deterministic key from params
  const parts = [
    'listings',
    status || 'available',
    slotType || 'all',
    lat && lon && radius ? `loc:${parseFloat(lat).toFixed(3)},${parseFloat(lon).toFixed(3)},${radius}` : 'anywhere',
    minPrice ? `min:${minPrice}` : '',
    maxPrice ? `max:${maxPrice}` : '',
    amenities ? `am:${amenities}` : '',
    `page:${offset || 0}:${limit || 20}`,
    sort ? `sort:${sort}` : '',
  ];

  return parts.filter(Boolean).join(':');
}

/**
 * Invalidate all listing caches
 * Call this when a new listing is created, updated, or deleted
 */
async function invalidateListingsCache() {
  console.log('Invalidating all listings cache...');
  return await delPattern('listings:*');
}

/**
 * Invalidate cache for a specific slot
 * @param {number} slotId - Parking slot ID
 */
async function invalidateSlotCache(slotId) {
  console.log(`Invalidating cache for slot ${slotId}...`);
  await del(`slot:${slotId}`);
  await invalidateListingsCache(); // Also invalidate listings since this slot might appear there
}

/**
 * Cache a single slot
 * @param {number} slotId - Parking slot ID
 * @param {Object} slotData - Slot data
 */
async function cacheSlot(slotId, slotData) {
  return await set(`slot:${slotId}`, slotData, CACHE_TTL.MEDIUM);
}

/**
 * Get cached slot
 * @param {number} slotId - Parking slot ID
 */
async function getCachedSlot(slotId) {
  return await get(`slot:${slotId}`);
}

/**
 * Invalidate booking caches for a user
 * @param {number} userId - User ID
 */
async function invalidateUserBookingsCache(userId) {
  console.log(`Invalidating bookings cache for user ${userId}...`);
  return await delPattern(`bookings:user:${userId}:*`);
}

/**
 * Invalidate booking caches for a slot
 * @param {number} slotId - Parking slot ID
 */
async function invalidateSlotBookingsCache(slotId) {
  console.log(`Invalidating bookings cache for slot ${slotId}...`);
  return await delPattern(`bookings:slot:${slotId}:*`);
}

module.exports = {
  get,
  set,
  del,
  delPattern,
  getOrSet,
  getListingsCacheKey,
  invalidateListingsCache,
  invalidateSlotCache,
  cacheSlot,
  getCachedSlot,
  invalidateUserBookingsCache,
  invalidateSlotBookingsCache,
  CACHE_TTL,
};
