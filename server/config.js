// Reads settings from the environment. `npm run api` / `npm run dev:api` load them from .env
// (copy .env.example to start). Missing required values stop the server with a clear message.

const required = ["MONGODB_URI", "SESSION_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
    console.error(`Missing ${missing.join(", ")}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
}

const config = {
    mongoUri: process.env.MONGODB_URI,
    sessionSecret: process.env.SESSION_SECRET,
    port: Number(process.env.PORT) || 3001,
    isProduction: process.env.NODE_ENV === "production",
};

export default config;
