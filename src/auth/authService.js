// MOCK auth service. This is the only file that knows auth is fake.
//
// When the API exists, replace the bodies below with fetch calls and keep the contract:
//   login({ email, password })        -> POST /api/auth/login
//   register({ name, email, password }) -> POST /api/auth/register
//   logout()                          -> POST /api/auth/logout
//   getSession()                      -> GET  /api/auth/me
// Every call resolves to { user: { name, email } } (getSession may resolve to null)
// or throws an Error whose message is safe to show to the user.
//
// The mock keeps only { name, email } in localStorage. It never stores passwords.

const SESSION_KEY = "hiips360.session";
const PROFILES_KEY = "hiips360.mockProfiles";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

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
        // Storage can be unavailable (private mode); the session then lasts until reload
    }
};

const normaliseEmail = (email) => email.trim().toLowerCase();

export async function login({ email, password }) {
    await delay();
    if (!email || !password) throw new Error("Enter your email and password.");

    const key = normaliseEmail(email);
    const profiles = readJSON(PROFILES_KEY, {});
    const user = { name: profiles[key]?.name ?? key, email: key };
    writeJSON(SESSION_KEY, user);
    return { user };
}

export async function register({ name, email, password }) {
    await delay();
    if (!name || !email || !password) throw new Error("Fill in every field.");

    const key = normaliseEmail(email);
    const profiles = readJSON(PROFILES_KEY, {});
    if (profiles[key]) throw new Error("An account with this email already exists. Sign in instead.");

    const user = { name: name.trim(), email: key };
    writeJSON(PROFILES_KEY, { ...profiles, [key]: { name: user.name } });
    writeJSON(SESSION_KEY, user);
    return { user };
}

export async function logout() {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch {
        // Nothing to clear
    }
}

export async function getSession() {
    const user = readJSON(SESSION_KEY, null);
    return user ? { user } : null;
}
