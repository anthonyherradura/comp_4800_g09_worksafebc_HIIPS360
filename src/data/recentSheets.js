const KEY = "hiips360.lastOpened";

function read() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
        return {};
    }
}

export function getLastOpened() {
    return read();
}

export function recordOpened(id) {
    try {
        localStorage.setItem(KEY, JSON.stringify({ ...read(), [id]: new Date().toISOString() }));
    } catch {
        // Storage can be blocked or full. Skipping the save is fine.
    }
}

// ---------- Dates on the Jobs page and on a finished inspection (FEAT-7) ----------
// Plain functions of a date and "now", so node --test can check them. The device's locale picks the format.

const DAY_MS = 24 * 60 * 60 * 1000;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// Calendar days from a to b (rounded, so a daylight-saving change doesn't move it)
const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / DAY_MS);
const parse = (iso) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
};
const timeOf = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// "Nov 20", or "Nov 20, 2025" when it isn't this year: "Started Nov 20"
export function formatDay(iso, now = new Date()) {
    const d = parse(iso);
    if (!d) return "";
    const opts = { month: "short", day: "numeric" };
    if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
    return d.toLocaleDateString(undefined, opts);
}

// "Oct 14, 2026", always with the year, for a record: "This inspection was finished on Oct 14, 2026"
export function formatFullDay(iso) {
    const d = parse(iso);
    return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

// "Oct 14, 2026, 1:05 pm": "Inspection finished Oct 14, 2026, 1:05 pm"
export function formatFullDayTime(iso) {
    const d = parse(iso);
    return d ? `${formatFullDay(iso)}, ${timeOf(d)}` : "";
}

// For the middle of a sentence ("Last opened …", "Finished …"):
// "today, 1:05 pm", "yesterday, 1:05 pm", "3 days ago", "last week", then the day ("Oct 14").
// A time a little ahead of the device's clock counts as today.
export function formatWhen(iso, now = new Date()) {
    const d = parse(iso);
    if (!d) return "";
    const days = daysBetween(d, now);
    if (days <= 0) return `today, ${timeOf(d)}`;
    if (days === 1) return `yesterday, ${timeOf(d)}`;
    if (days < 7) return `${days} days ago`;
    if (days < 14) return "last week";
    return formatDay(iso, now);
}
