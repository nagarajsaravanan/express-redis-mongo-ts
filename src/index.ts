import { env } from "./config/env.config";
import app from "./app";
import redisClient from "./config/redis.config";
import { connectDB } from "./config/db.config";

const startServer = async () => {
    try {
        console.log('start server')
        // redis connection
        await redisClient.connect();
        // mongodb connection
        await connectDB();

        app.listen(env.PORT, () => {
            console.log(`Server running on port ${env.PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

startServer();