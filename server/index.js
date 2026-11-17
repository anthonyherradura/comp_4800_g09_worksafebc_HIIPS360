// API entry point. Run with `npm run dev:api` (restarts on change) or `npm run api`.
import mongoose from "mongoose";
import config from "./config.js";
import { createApp } from "./app.js";
import { applySchema } from "./db/setup.js";

try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
} catch (err) {
    console.error(`Could not connect to MongoDB at ${config.mongoUri}. Is the MongoDB service running?`);
    console.error(err.message);
    process.exit(1);
}

// Bring MongoDB's validators and indexes up to date before the first request (the same as `npm run db:setup`),
// so a pull that changes them works without running anything by hand. The unique email index is built here too,
// so duplicate sign-ups are rejected from the start.
try {
    await applySchema();
} catch (err) {
    // A database user that may not change validators (collMod) can still serve the app with the ones it has
    console.warn(`Couldn't update MongoDB's validators, so the existing ones stay: ${err.message}`);
    await mongoose.syncIndexes();
}

createApp().listen(config.port, () => {
    console.log(`HIIPS360 API on http://localhost:${config.port} (MongoDB connected)`);
});
