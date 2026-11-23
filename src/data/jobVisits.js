// Coming back to a job site after its inspection was finished (FEAT-7). A finished inspection is read-only, so
// the next visit is a new job with a number: "Oak St yard", then "Oak St yard (2)", "Oak St yard (3)".
// Plain ESM with no browser or Vite features: the server (POST /api/jobs) and the Jobs page use the same rule.
//
// Adding a label (ignoring case, like the database's label index):
// - a visit to that site that isn't finished is reopened: the one with exactly that label if it's open,
//   otherwise the most recently opened one;
// - when every visit to it is finished, a new visit gets the next number;
// - a site the officer doesn't have yet is created as typed.
// The number is part of the label. A real product would keep it in its own field (see CLAUDE.md).

// "  Oak   St. " -> "Oak St."
export const cleanLabel = (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

const VISIT = /^(.*\S) \((\d+)\)$/;

// "Oak St yard (2)" -> { base: "Oak St yard", visit: 2 }; "Oak St yard" -> { base: "Oak St yard", visit: 1 }
export function splitVisit(label) {
    const match = label.match(VISIT);
    const visit = match ? Number(match[2]) : 1;
    return match && visit >= 2 ? { base: match[1], visit } : { base: label, visit: 1 };
}

// The same rule as the database's label index (models/Job.js LABEL_COLLATION): case doesn't count, accents do
export const sameLabel = (a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }) === 0;

const time = (date) => (date ? new Date(date).getTime() : 0);

// Every visit to the site a label names, first visit first: [{ job, base, visit }]
// jobs: the officer's jobs, each with at least { label, finishedAt, lastOpenedAt }
export function visitsTo(label, jobs) {
    const { base } = splitVisit(label);
    return jobs
        .map((job) => ({ job, ...splitVisit(job.label) }))
        .filter((v) => sameLabel(v.base, base))
        .sort((a, b) => a.visit - b.visit);
}

// What adding `label` does:
//   { reopen: job }           a visit to that site is still open
//   { create: label, after }  a new job; `after` is the finished visit it follows (null for a new site)
export function planNewJob(label, jobs) {
    const visits = visitsTo(label, jobs);
    if (!visits.length) return { create: label, after: null };

    const open = visits.filter((v) => !v.job.finishedAt);
    if (open.length) {
        const exact = open.find((v) => sameLabel(v.job.label, label));
        const newest = [...open].sort((a, b) => time(b.job.lastOpenedAt) - time(a.job.lastOpenedAt))[0];
        return { reopen: (exact ?? newest).job };
    }

    const last = visits[visits.length - 1];
    // The first visit's label keeps the officer's own capitals: "oak st yard" after "Oak St yard" gives "Oak St yard (2)"
    return { create: `${visits[0].base} (${last.visit + 1})`, after: last.job };
}
