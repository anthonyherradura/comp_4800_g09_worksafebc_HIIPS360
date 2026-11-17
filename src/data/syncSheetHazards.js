// What happens to a job's hazard list when its protocol sheets are picked, added, removed or cleared.
// Plain function over one job's hazards, so the server (server/routes/jobs.js) and the tests use the same rule.
//
// - Each chosen sheet's hazards are added, in sheet order, unless the job already has them.
// - A hazard that more than one chosen sheet lists (same name, e.g. "Working alone") is added once, from the
//   first of those sheets. Repeats within one sheet stay: Log Transport lists some hazards at two stages. If that sheet is removed later, the next sheet that lists it brings it back.
// - A removed sheet's hazards go only if the officer hasn't worked on them yet
//   (no photo, no comment, not marked not applicable). Anything with work on it stays.
// - Hazards the officer added themselves are never touched.
//
// New hazards come back without an id; the caller gives them one.

const untouched = (h) => !(h.photoIds?.length > 0) && !h.comment?.trim() && !h.notApplicable;

// "Working Alone." and "working alone" are the same hazard
const sameName = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// hazards: the job's hazards. sheets: the chosen sheets in order, [{ sheetId, hazards: [{ key, name }] }]
// (empty when clearing them all).
export function syncSheetHazards(hazards, { sheets, now = new Date() }) {
    const chosen = new Set(sheets.map((s) => s.sheetId));
    const kept = hazards.filter((h) => !(h.source === "sheet" && !chosen.has(h.sheetId) && untouched(h)));

    const fromSheets = kept.filter((h) => h.source === "sheet");
    const have = new Set(fromSheets.map((h) => `${h.sheetId}/${h.sheetKey}`));
    // name -> the sheet that brought it in first
    const owner = new Map();
    for (const h of fromSheets) if (!owner.has(sameName(h.name))) owner.set(sameName(h.name), h.sheetId);
    const added = [];
    for (const { sheetId, hazards: sheetHazards } of sheets) {
        for (const s of sheetHazards) {
            const name = sameName(s.name);
            if (have.has(`${sheetId}/${s.key}`) || (owner.has(name) && owner.get(name) !== sheetId)) continue;
            if (!owner.has(name)) owner.set(name, sheetId);
            added.push({
                source: "sheet", // the guidance (stage, controls, legislation) is read from the sheet by sheetId + sheetKey
                sheetId,
                sheetKey: s.key,
                name: s.name,
                comment: "",
                photoIds: [],
                notApplicable: false,
                createdAt: now,
            });
        }
    }

    return [...kept, ...added];
}
