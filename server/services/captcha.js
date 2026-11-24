// Bot check on sign-in and registration with Cloudflare Turnstile (FEAT-10, B-35). The client asked for this
// instead of a site password: the worry is bots signing up and spending the Gemini quota.
//
// It is on only when both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set. With neither set (local
// development, npm test, npm run test:db) the check is skipped. The keys are read on every call, not at import,
// so tests can turn the check on and off.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 8000;
// Turnstile tokens are at most 2048 characters
const MAX_TOKEN_CHARS = 2048;
// Cloudflare's answer when the problem is our secret key, not the officer's token
const CONFIG_ERRORS = ["missing-input-secret", "invalid-input-secret"];

export const captchaSiteKey = () => (captchaEnabled() ? process.env.TURNSTILE_SITE_KEY : null);

export function captchaEnabled() {
    return Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

// A line for the server log on start, or "" when the settings are fine
export function captchaStartupWarning({ isProduction }) {
    const site = Boolean(process.env.TURNSTILE_SITE_KEY);
    const secret = Boolean(process.env.TURNSTILE_SECRET_KEY);
    if (site !== secret) {
        return "Set both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or neither. The bot check is off until both are set.";
    }
    if (!site && isProduction) {
        return "TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY aren't set, so sign-in and registration have no bot check.";
    }
    return "";
}

// Resolves to { ok: true } or { ok: false, reason } where reason is
//   "missing":     no token was sent
//   "failed":      Cloudflare says the token is wrong, expired or already used
//   "unavailable": Cloudflare couldn't be reached, or our secret key is wrong
export async function verifyCaptcha(token, remoteIp) {
    if (!captchaEnabled()) return { ok: true };
    if (typeof token !== "string" || token.length === 0) return { ok: false, reason: "missing" };
    if (token.length > MAX_TOKEN_CHARS) return { ok: false, reason: "failed" };

    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    let data;
    try {
        const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) {
            console.error(`Turnstile answered ${res.status}`);
            return { ok: false, reason: "unavailable" };
        }
        data = await res.json();
    } catch (err) {
        console.error("Couldn't reach Turnstile:", err.message);
        return { ok: false, reason: "unavailable" };
    }

    if (data?.success === true) return { ok: true };
    const codes = Array.isArray(data?.["error-codes"]) ? data["error-codes"] : [];
    if (codes.some((code) => CONFIG_ERRORS.includes(code))) {
        console.error("Turnstile rejected TURNSTILE_SECRET_KEY:", codes.join(", "));
        return { ok: false, reason: "unavailable" };
    }
    return { ok: false, reason: "failed" };
}
