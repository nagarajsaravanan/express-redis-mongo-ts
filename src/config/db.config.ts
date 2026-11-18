import mongoose from 'mongoose';
import { env } from "./env.config";

/**
 * Default MongoDB Configuration
 * Host: 127.0.0.1:27017
 * Database: express_redis_db
 */
const MONGO_URI = env.MONGODB_URI || 'mongodb://admin:password%40123@localhost:27017/express_redis_db?authSource=admin';

// Lifecycle Event Listeners
mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB: Successfully connected to database.');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Connection Error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 MongoDB: Connection disconnected.');
});

/**
 * Connect to MongoDB
 */
export const connectDB = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState >= 1) {
            return;
        }
        await mongoose.connect(MONGO_URI);
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        throw error;
    }
};

/**
 * Gracefully disconnect from MongoDB
 */
export const disconnectDB = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('✅ MongoDB disconnected gracefully.');
        }
    } catch (error) {
        console.error('❌ Error disconnecting from MongoDB:', error);
    }
};

export default connectDB;

