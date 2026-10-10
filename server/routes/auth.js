// Auth API. The contract matches src/auth/authService.js:
//   POST /api/auth/register  { name, email, password } -> 201 { user }
//   POST /api/auth/login     { email, password }       -> 200 { user }
//   POST /api/auth/logout                              -> 204
//   GET  /api/auth/me                                  -> 200 { user } | 401
// Errors are { error } with a message that is safe to show to the officer.

import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import User from "../models/User.js";
import { validateAccount, validateLogin } from "../../src/auth/validation.js";

const BCRYPT_ROUNDS = 12;
// Compared against when the email doesn't exist, so a miss takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync("no-such-user-placeholder", BCRYPT_ROUNDS);

const router = Router();

// Only failed attempts count, so normal use never hits the limit
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Wait a few minutes and try again." },
});

const asString = (value) => (typeof value === "string" ? value : "");
const normaliseEmail = (email) => email.trim().toLowerCase();
const firstError = (errors) => Object.values(errors)[0];

// express-session's regenerate is callback-based
const regenerateSession = (req) =>
    new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));

async function signIn(req, user) {
    // New session id on every sign-in, so a planted session id can't be reused (session fixation)
    await regenerateSession(req);
    req.session.userId = user.id;
}

router.post("/register", authLimiter, async (req, res) => {
    const name = asString(req.body?.name).trim();
    const email = asString(req.body?.email);
    const password = asString(req.body?.password);

    const errors = validateAccount({ name, email, password });
    if (Object.keys(errors).length > 0) return res.status(400).json({ error: firstError(errors) });

    const key = normaliseEmail(email);
    const duplicate = { error: "An account with this email already exists. Sign in instead." };
    if (await User.exists({ email: key })) return res.status(409).json(duplicate);

    let user;
    try {
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        user = await User.create({ name, email: key, passwordHash });
    } catch (err) {
        // Two registrations for the same email at once: the unique index catches the second
        if (err.code === 11000) return res.status(409).json(duplicate);
        throw err;
    }

    await signIn(req, user);
    res.status(201).json({ user: user.toPublic() });
});

router.post("/login", authLimiter, async (req, res) => {
    const email = asString(req.body?.email);
    const password = asString(req.body?.password);

    const errors = validateLogin({ email, password });
    if (Object.keys(errors).length > 0) return res.status(400).json({ error: firstError(errors) });

    const user = await User.findOne({ email: normaliseEmail(email) });
    const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !matches) return res.status(401).json({ error: "Email or password is incorrect." });

    await signIn(req, user);
    res.json({ user: user.toPublic() });
});

router.post("/logout", (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("hiips360.sid");
        res.status(204).end();
    });
});

router.get("/me", async (req, res) => {
    const user = req.session.userId ? await User.findById(req.session.userId) : null;
    if (!user) return res.status(401).json({ error: "Not signed in." });
    res.json({ user: user.toPublic() });
});

export default router;
