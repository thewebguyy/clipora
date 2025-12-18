import { Redis } from 'ioredis';

/**
 * Redis Configuration
 * Used for BullMQ job queue system
 */

// Redis connection options
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

/**
 * Create Redis connection for BullMQ
 */
export const createRedisConnection = (): Redis => {
  const redis = new Redis(redisOptions);

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
  });

  redis.on('close', () => {
    console.log('📴 Redis connection closed');
  });

  return redis;
};

/**
 * Test Redis connection
 */
export const testRedisConnection = async (): Promise<boolean> => {
  const redis = createRedisConnection();
  
  try {
    await redis.ping();
    console.log('✅ Redis ping successful');
    await redis.quit();
    return true;
  } catch (error) {
    console.error('❌ Redis ping failed:', error);
    return false;
  }
};

export default redisOptions;