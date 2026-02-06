const Redis = require('redis');

class Cache {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (!this.client) {
      try {
        this.client = Redis.createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        this.client.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });
        
        await this.client.connect();
        this.isConnected = true;
        console.log('Redis connected successfully');
      } catch (error) {
        console.warn('Redis connection failed, using memory cache:', error.message);
        this.isConnected = false;
      }
    }
  }

  async get(key) {
    try {
      if (this.isConnected) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      }
      return this.memoryCache?.get?.(key) || null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      if (this.isConnected) {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      } else {
        if (!this.memoryCache) this.memoryCache = new Map();
        this.memoryCache.set(key, value);
        
        // Simple memory cache cleanup after ttl
        setTimeout(() => {
          this.memoryCache.delete(key);
        }, ttlSeconds * 1000);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key) {
    try {
      if (this.isConnected) {
        await this.client.del(key);
      } else {
        this.memoryCache?.delete?.(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  generateKey(prefix, userId, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${userId}:${paramString}`;
  }
}

const cache = new Cache();
cache.connect().catch(console.error);

module.exports = { cache };