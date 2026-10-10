// Auth service: talks to the HIIPS360 API (server/routes/auth.js) through /api, which Vite proxies in dev.
//
// Contract the rest of the app relies on:
//   login({ email, password })          -> POST /api/auth/login
//   register({ name, email, password }) -> POST /api/auth/register
//   logout()                            -> POST /api/auth/logout
//   getSession()                        -> GET  /api/auth/me
// Every call resolves to { user: { name, email } } (getSession may resolve to null)
// or throws an Error whose message is safe to show to the user.
//
// The session itself is an httpOnly cookie the browser handles. Offline first: the last signed-in
// { name, email } is cached on the device so an officer with no signal stays signed in. Passwords
// are never stored.

const SESSION_KEY = "hiips360.session";
const OFFLINE_MESSAGE = "You're offline. Signing in needs a connection.";
const UNREACHABLE_MESSAGE = "Can't reach the HIIPS360 server. Try again shortly.";

const readJSON = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeJSON = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage can be unavailable (private mode); the cached session then lasts until reload
    }
};

const removeKey = (key) => {
    try {
        localStorage.removeItem(key);
    } catch {
        // Nothing to clear
    }
};

// Left behind by the old mock auth
removeKey("hiips360.mockProfiles");

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

async function request(path, { method = "GET", body } = {}) {
    let response;
    try {
        response = await fetch(`/api/auth${path}`, {
            method,
            credentials: "same-origin",
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        // fetch only rejects when the request never got a response: no network
        throw new ApiError(OFFLINE_MESSAGE, 0);
    }

    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(data?.error ?? UNREACHABLE_MESSAGE, response.status);
    return data;
}

const remember = ({ user }) => {
    writeJSON(SESSION_KEY, user);
    return { user };
};

export async function login({ email, password }) {
    return remember(await request("/login", { method: "POST", body: { email, password } }));
}

export async function register({ name, email, password }) {
    return remember(await request("/register", { method: "POST", body: { name, email, password } }));
}

export async function logout() {
    removeKey(SESSION_KEY);
    try {
        await request("/logout", { method: "POST" });
    } catch {
        // Offline or server down: the device is signed out either way
    }
}

export async function getSession() {
    try {
        return remember(await request("/me"));
    } catch (error) {
        if (error.status === 401) {
            removeKey(SESSION_KEY);
            return null;
        }
        // Offline or server unreachable: trust the last session this device saw
        const user = readJSON(SESSION_KEY, null);
        return user ? { user } : null;
    }
}
