// TEST-CAPTCHA: the Turnstile bot check on sign-in and registration (FEAT-10, B-35).
// Run with `npm test`. Cloudflare, the User model and the session are faked, so no key, network or database is needed.
import { test, mock, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import bcrypt from "bcryptjs";

// --- Fakes -------------------------------------------------------------------------------------------------

const PASSWORD_HASH = bcrypt.hashSync("a-long-password-1", 4);
const users = new Map();
const userCalls = [];
const fakeUser = (doc) => ({ ...doc, id: doc.email, toPublic: () => ({ name: doc.name, email: doc.email }) });
mock.module("../server/models/User.js", {
    defaultExport: {
        exists: async ({ email }) => {
            userCalls.push("exists");
            return users.has(email);
        },
        create: async (doc) => {
            userCalls.push("create");
            users.set(doc.email, doc);
            return fakeUser(doc);
        },
        findOne: async ({ email }) => {
            userCalls.push("findOne");
            return users.has(email) ? fakeUser(users.get(email)) : null;
        },
        findById: async () => null,
    },
});

const { verifyCaptcha, captchaSiteKey, captchaStartupWarning } = await import("../server/services/captcha.js");
const { default: authRoutes } = await import("../server/routes/auth.js");

const SITE = "site-key-test";
const SECRET = "secret-key-test";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const realFetch = globalThis.fetch;

// What the pretend Cloudflare does next: a function from the posted form to a Response, or throws
let cloudflare;
let cloudflareCalls;

beforeEach(() => {
    process.env.TURNSTILE_SITE_KEY = SITE;
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    users.clear();
    userCalls.length = 0;
    cloudflareCalls = [];
    cloudflare = (form) => Response.json({ success: form.get("response") === "good-token" ? true : false, "error-codes": [] });
    // Only Cloudflare is faked; requests to the test server go through
    globalThis.fetch = async (url, init) => {
        if (String(url) === VERIFY_URL) {
            const form = new URLSearchParams(init.body);
            cloudflareCalls.push(form);
            return cloudflare(form);
        }
        return realFetch(url, init);
    };
});

afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
});

// --- The service ---------------------------------------------------------------------------------------------

test("CAP-01 with no keys set the check is off and Cloudflare isn't called", async () => {
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.deepEqual(await verifyCaptcha(undefined, "1.2.3.4"), { ok: true });
    assert.equal(captchaSiteKey(), null);
    assert.equal(cloudflareCalls.length, 0);
    assert.equal(captchaStartupWarning({ isProduction: false }), "");
});

test("CAP-02 only one key set: the check stays off and the server warns", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.deepEqual(await verifyCaptcha(undefined), { ok: true });
    assert.equal(captchaSiteKey(), null);
    assert.match(captchaStartupWarning({ isProduction: false }), /both/);
});

test("CAP-03 production with no keys warns that there's no bot check", () => {
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.match(captchaStartupWarning({ isProduction: true }), /no bot check/);
    process.env.TURNSTILE_SITE_KEY = SITE;
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    assert.equal(captchaStartupWarning({ isProduction: true }), "");
});

test("CAP-04 a missing or oversized token fails without calling Cloudflare", async () => {
    assert.deepEqual(await verifyCaptcha(undefined), { ok: false, reason: "missing" });
    assert.deepEqual(await verifyCaptcha(""), { ok: false, reason: "missing" });
    assert.deepEqual(await verifyCaptcha(42), { ok: false, reason: "missing" });
    assert.deepEqual(await verifyCaptcha("x".repeat(2049)), { ok: false, reason: "failed" });
    assert.equal(cloudflareCalls.length, 0);
});

test("CAP-05 a good token passes, and Cloudflare gets the secret, token and IP", async () => {
    assert.deepEqual(await verifyCaptcha("good-token", "203.0.113.7"), { ok: true });
    assert.equal(cloudflareCalls.length, 1);
    const form = cloudflareCalls[0];
    assert.equal(form.get("secret"), SECRET);
    assert.equal(form.get("response"), "good-token");
    assert.equal(form.get("remoteip"), "203.0.113.7");
});

test("CAP-06 a token Cloudflare rejects (wrong, expired or reused) fails", async () => {
    cloudflare = () => Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] });
    assert.deepEqual(await verifyCaptcha("used-token"), { ok: false, reason: "failed" });
});

test("CAP-07 Cloudflare down, erroring or rejecting our secret is 'unavailable', not the officer's fault", async (t) => {
    t.mock.method(console, "error", () => {});
    cloudflare = () => {
        throw new TypeError("fetch failed");
    };
    assert.deepEqual(await verifyCaptcha("good-token"), { ok: false, reason: "unavailable" });
    cloudflare = () => new Response("oops", { status: 500 });
    assert.deepEqual(await verifyCaptcha("good-token"), { ok: false, reason: "unavailable" });
    cloudflare = () => Response.json({ success: false, "error-codes": ["invalid-input-secret"] });
    assert.deepEqual(await verifyCaptcha("good-token"), { ok: false, reason: "unavailable" });
});

// --- The routes ----------------------------------------------------------------------------------------------

const servers = [];
async function startApp() {
    const app = express();
    app.use(express.json());
    // The real app keeps sessions in MongoDB; this stands in for express-session
    app.use((req, res, next) => {
        req.session = { regenerate: (cb) => cb() };
        next();
    });
    app.use("/api/auth", authRoutes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}/api/auth`;
}
after(() => servers.forEach((s) => s.close()));

async function post(url, body) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
}

const account = { name: "Officer A", email: "a@example.com", password: "a-long-password-1" };

test("CAP-08 GET /captcha gives the site key, or null when the check is off", async () => {
    const base = await startApp();
    assert.deepEqual(await (await fetch(`${base}/captcha`)).json(), { siteKey: SITE });
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.deepEqual(await (await fetch(`${base}/captcha`)).json(), { siteKey: null });
});

test("CAP-09 register without a token is refused before any account is made", async () => {
    const base = await startApp();
    const res = await post(`${base}/register`, account);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /human/);
    assert.deepEqual(userCalls, [], "no database work for a bot");
});

test("CAP-10 register with a token Cloudflare accepts creates the account", async () => {
    const base = await startApp();
    const res = await post(`${base}/register`, { ...account, captchaToken: "good-token" });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual(res.body.user, { name: account.name, email: account.email });
});

test("CAP-11 login with a rejected token is refused before the password is checked", async () => {
    users.set(account.email, { name: account.name, email: account.email, passwordHash: PASSWORD_HASH });
    const base = await startApp();
    const res = await post(`${base}/login`, { email: account.email, password: account.password, captchaToken: "bad-token" });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /didn't go through/);
    assert.deepEqual(userCalls, []);

    const ok = await post(`${base}/login`, { email: account.email, password: account.password, captchaToken: "good-token" });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
});

test("CAP-12 Cloudflare unreachable answers 503 with a try-again message", async (t) => {
    t.mock.method(console, "error", () => {});
    cloudflare = () => {
        throw new TypeError("fetch failed");
    };
    const base = await startApp();
    const res = await post(`${base}/register`, { ...account, captchaToken: "good-token" });
    assert.equal(res.status, 503);
    assert.match(res.body.error, /Try again in a minute/);
});

test("CAP-13 with the keys unset, register and login work with no token (local development and the tests)", async () => {
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    const base = await startApp();
    assert.equal((await post(`${base}/register`, account)).status, 201);
    assert.equal((await post(`${base}/login`, { email: account.email, password: account.password })).status, 200);
    assert.equal(cloudflareCalls.length, 0);
});

test("CAP-14 a form error still comes first, so a typo doesn't use up the token", async () => {
    const base = await startApp();
    const res = await post(`${base}/register`, { ...account, email: "not-an-email", captchaToken: "good-token" });
    assert.equal(res.status, 400);
    assert.equal(cloudflareCalls.length, 0);
});

// --- The browser side ----------------------------------------------------------------------------------------

test("CAP-15 the auth service sends the token and reads the site key", async () => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
    };
    const { login, getCaptchaSiteKey } = await import("../src/auth/authService.js");
    const sent = [];
    globalThis.fetch = async (url, init = {}) => {
        sent.push({ url, body: init.body ? JSON.parse(init.body) : null });
        if (url.endsWith("/captcha")) return Response.json({ siteKey: "" });
        return Response.json({ user: { name: "A", email: "a@example.com" } });
    };
    await login({ email: "a@example.com", password: "x", captchaToken: "tok" });
    assert.equal(sent[0].body.captchaToken, "tok");
    assert.equal(await getCaptchaSiteKey(), null, "an empty key means the check is off");
});
