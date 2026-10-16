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

export function formatOpened(iso) {
    if (!iso) return "Not opened yet";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Not opened yet";

    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

    const opts = { month: "short", day: "numeric" };
    if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
    return `${d.toLocaleDateString(undefined, opts)}, ${time}`;
}