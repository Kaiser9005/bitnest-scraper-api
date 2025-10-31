/**
 * Simple in-memory cache for extraction results
 * Prevents hammering bitnest.me/intro with too many requests
 */

class Cache {
  constructor() {
    this.data = null;
    this.timestamp = null;
    this.ttl = parseInt(process.env.CACHE_TTL_MS) || 300000; // 5 minutes default
  }

  /**
   * Set cache data
   * @param {Object} data - Data to cache
   */
  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  }

  /**
   * Get cache data if still valid
   * @returns {Object|null} Cached data or null if expired
   */
  get() {
    if (!this.data || !this.timestamp) {
      return null;
    }

    const age = Date.now() - this.timestamp;

    if (age > this.ttl) {
      // Cache expired
      this.data = null;
      this.timestamp = null;
      return null;
    }

    return this.data;
  }

  /**
   * Check if cache is valid
   * @returns {boolean} True if cache is valid
   */
  isValid() {
    return this.get() !== null;
  }

  /**
   * Get cache age in milliseconds
   * @returns {number|null} Age in ms or null if no cache
   */
  getAge() {
    if (!this.timestamp) {
      return null;
    }

    return Date.now() - this.timestamp;
  }

  /**
   * Clear cache
   */
  clear() {
    this.data = null;
    this.timestamp = null;
  }
}

// Singleton instance
const cache = new Cache();

module.exports = cache;
