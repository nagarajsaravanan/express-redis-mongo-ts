import { createClient, type RedisClientType } from 'redis';
import { env } from "./env.config";

/**
 * Default Redis Configuration
 * Host: 127.0.0.1
 * Port: 6379
 * Default URL: redis://127.0.0.1:6379
 */
const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';

export const redisClient: RedisClientType = createClient({
    url: REDIS_URL,
});

// Lifecycle Event Listeners
redisClient.on('connect', () => {
    console.log('🔄 Redis: Connecting to server...');
});

redisClient.on('ready', () => {
    console.log('✅ Redis: Connected and ready for commands.');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

redisClient.on('reconnecting', () => {
    console.log('⚠️ Redis: Reconnecting to server...');
});

redisClient.on('end', () => {
    console.log('🔌 Redis: Connection closed.');
});

/**
 * Connect to Redis instance
 */
export const connectRedis = async (): Promise<void> => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
    }
};

/**
 * Gracefully disconnect from Redis instance
 */
export const disconnectRedis = async (): Promise<void> => {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log('✅ Redis client disconnected.');
        }
    } catch (error) {
        console.error('❌ Error disconnecting Redis:', error);
    }
};

export default redisClient;

