// API entry point. Run with `npm run dev:api` (restarts on change) or `npm run api`.
import mongoose from "mongoose";
import config from "./config.js";
import { createApp } from "./app.js";

try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
} catch (err) {
    console.error(`Could not connect to MongoDB at ${config.mongoUri}. Is the MongoDB service running?`);
    console.error(err.message);
    process.exit(1);
}

// Build the unique email index before the first request, so duplicate sign-ups are rejected from the start
await mongoose.syncIndexes();

createApp().listen(config.port, () => {
    console.log(`HIIPS360 API on http://localhost:${config.port} (MongoDB connected)`);
});
