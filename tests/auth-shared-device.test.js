// TEST-AUTH: signing out on a shared device (B-13). Fetch and localStorage are mocked; no API or DB needed.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};
const { login, logout, getSession } = await import("../src/auth/authService.js");

const realFetch = globalThis.fetch;
let calls;
let online;
const officerA = { name: "Officer A", email: "a@example.com" };

beforeEach(() => {
    store.clear();
    calls = [];
    online = true;
    // A pretend server that keeps one session until /logout reaches it
    let signedIn = null;
    globalThis.fetch = async (url, { method = "GET", body } = {}) => {
        if (!online) throw new TypeError("Failed to fetch");
        calls.push(`${method} ${url}`);
        if (url.endsWith("/login")) {
            signedIn = { ...officerA, email: JSON.parse(body).email };
            return Response.json({ user: signedIn });
        }
        if (url.endsWith("/logout")) {
            signedIn = null;
            return new Response(null, { status: 204 });
        }
        if (url.endsWith("/me")) {
            return signedIn ? Response.json({ user: signedIn }) : Response.json({ error: "Not signed in." }, { status: 401 });
        }
        throw new Error(`unexpected ${url}`);
    };
});
afterEach(() => {
    globalThis.fetch = realFetch;
});

test("AUTH-01 signing out offline doesn't let the next reload sign the last officer back in", async () => {
    await login({ email: officerA.email, password: "x" });
    online = false;
    await logout(); // the server never heard about it
    assert.equal(await getSession(), null, "still offline: nobody is signed in");

    online = true;
    assert.equal(await getSession(), null, "back online: the old session is ended, not restored");
    assert.ok(calls.includes("POST /api/auth/logout"));
    assert.equal(await getSession(), null);
});

test("AUTH-02 signing in again after an offline sign-out works normally", async () => {
    await login({ email: officerA.email, password: "x" });
    online = false;
    await logout();
    online = true;
    const { user } = await login({ email: "b@example.com", password: "x" });
    assert.equal(user.email, "b@example.com");
    assert.equal((await getSession()).user.email, "b@example.com");
});

test("AUTH-03 a normal sign-out leaves nothing pending", async () => {
    await login({ email: officerA.email, password: "x" });
    await logout();
    calls = [];
    assert.equal(await getSession(), null);
    assert.deepEqual(calls, ["GET /api/auth/me"]);
});
