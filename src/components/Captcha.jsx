// The bot check on the sign-in and register forms: a Cloudflare Turnstile widget (FEAT-10, B-35).
// Most people see a tick and nothing to do; Cloudflare asks for a tap only when it's unsure.
//
// onChange receives the token to send with the form:
//   ""     not ready yet (still checking, expired, or the check failed to load)
//   string ready to send
//   null   no check needed: the server has the keys unset, or couldn't be reached (it answers for itself then)
// Call ref.current.reset() after every failed submit: a token works once.
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { getCaptchaSiteKey } from "../auth/authService";
import "./Captcha.css";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let siteKeyRequest = null;
let scriptRequest = null;

function loadSiteKey() {
    siteKeyRequest ??= getCaptchaSiteKey().catch((err) => {
        siteKeyRequest = null; // ask again next time
        throw err;
    });
    return siteKeyRequest;
}

function loadScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    scriptRequest ??= new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
        script.onerror = () => {
            scriptRequest = null;
            script.remove();
            reject(new Error("Turnstile didn't load"));
        };
        document.head.appendChild(script);
    });
    return scriptRequest;
}

export default function Captcha({ action, onChange, ref }) {
    const boxRef = useRef(null);
    const widgetRef = useRef(null);
    // loading | ready | off | unreachable | error
    const [status, setStatus] = useState("loading");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        let widgetId = null;

        (async () => {
            let siteKey;
            try {
                siteKey = await loadSiteKey();
            } catch {
                if (cancelled) return;
                setStatus("unreachable");
                onChange(null);
                return;
            }
            if (cancelled) return;
            if (!siteKey) {
                setStatus("off");
                onChange(null);
                return;
            }

            let turnstile;
            try {
                turnstile = await loadScript();
            } catch {
                if (!cancelled) setStatus("error");
                return;
            }
            if (cancelled || !boxRef.current) return;

            widgetId = turnstile.render(boxRef.current, {
                sitekey: siteKey,
                action,
                theme: "light",
                size: "flexible",
                callback: (token) => onChange(token),
                "expired-callback": () => onChange(""),
                "error-callback": () => onChange(""),
            });
            widgetRef.current = widgetId;
            setStatus("ready");
        })();

        return () => {
            cancelled = true;
            if (widgetId != null) window.turnstile?.remove(widgetId);
            widgetRef.current = null;
        };
    }, [action, attempt, onChange]);

    const retry = () => {
        onChange("");
        setStatus("loading");
        setAttempt((n) => n + 1);
    };

    useImperativeHandle(ref, () => ({
        reset() {
            if (status === "off") return;
            if (status === "ready" && widgetRef.current != null) {
                onChange("");
                window.turnstile?.reset(widgetRef.current);
            } else {
                retry();
            }
        },
    }));

    if (status === "off" || status === "unreachable") return null;

    return (
        <div className="captcha">
            {status === "error" ? (
                <p className="captcha-error" role="alert">
                    The check that you're human didn't load. Check your connection, then{" "}
                    <button type="button" className="captcha-retry" onClick={retry}>
                        try again
                    </button>
                    .
                </p>
            ) : (
                <div ref={boxRef} className="captcha-box" />
            )}
        </div>
    );
}
