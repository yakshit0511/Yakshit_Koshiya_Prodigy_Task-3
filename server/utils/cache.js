/**
 * utils/cache.js
 * -----------------------------------------
 * Reusable in-memory API response caching utility.
 * Powered by node-cache.
 *
 * Implements:
 *  - Cache instance with 5 minute default TTL.
 *  - Getter, Setter, and Delete operations.
 *  - Dynamic cache clear keys matching mutations.
 * -----------------------------------------
 */

const NodeCache = require("node-cache");
const logger = require("./logger");

// Initialize cache with default Time-To-Live (5 minutes) and checking period (60 seconds)
const apiCache = new NodeCache({
  stdTTL: 5 * 60,
  checkperiod: 60,
});

/**
 * getCache — Retrieve a value from in-memory cache.
 * @param {string} key - Cache lookup key
 * @returns {any|null} Cached data or null if miss
 */
const getCache = (key) => {
  const value = apiCache.get(key);
  if (value !== undefined) {
    logger.debug(`Cache HIT: key="${key}"`);
    return value;
  }
  logger.debug(`Cache MISS: key="${key}"`);
  return null;
};

/**
 * setCache — Stores a value in-memory with optional custom TTL.
 * @param {string} key - Cache lookup key
 * @param {any} value - Value to cache
 * @param {number} [ttl] - Optional TTL in seconds
 * @returns {boolean} Success status
 */
const setCache = (key, value, ttl) => {
  logger.debug(`Cache SET: key="${key}"` + (ttl ? ` TTL=${ttl}s` : ""));
  if (ttl !== undefined) {
    return apiCache.set(key, value, ttl);
  }
  return apiCache.set(key, value);
};

/**
 * deleteCache — Evicts a specific key from the cache.
 * @param {string} key - Cache key
 */
const deleteCache = (key) => {
  logger.debug(`Cache DELETE: key="${key}"`);
  return apiCache.del(key);
};

/**
 * clearCachePattern — Evicts cache keys matching a pattern.
 * E.g., clearing "product-slug-" will remove all cached slugs.
 * @param {string} prefix - Key prefix to evict
 */
const clearCachePattern = (prefix) => {
  const keys = apiCache.keys();
  const targets = keys.filter((k) => k.startsWith(prefix));
  if (targets.length > 0) {
    logger.debug(`Cache EVICT PATTERN: prefix="${prefix}" keys=[${targets.join(", ")}]`);
    apiCache.del(targets);
  }
};

module.exports = {
  getCache,
  setCache,
  deleteCache,
  clearCachePattern,
};
