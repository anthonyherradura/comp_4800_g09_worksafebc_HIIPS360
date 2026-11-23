// TEST-DB: the jobs, hazards, photos and recent-sheets API against a real MongoDB (server/routes/jobs.js, photos.js, me.js).
// Run with `npm run test:db`. Needs MONGODB_TEST_URI (a plain local server is enough, no replica set);
// skips without it. Creates its own hiips360_test_<random> database and drops it afterwards.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { getJobChecklist } from "../../server/services/sheetCatalog.js";

const BASE_URI = process.env.MONGODB_TEST_URI;
const skip = BASE_URI ? false : "set MONGODB_TEST_URI to run (see .env.example)";

const LOG = "cu-732044"; // Log Transport: 40 hazards, 13 checklist items
const LTC = "cu-766011"; // Long-term Care: 14 hazards

let mongoose, Job, Photo, LIMITS, base, server;

function testUri() {
    const url = new URL(BASE_URI);
    url.pathname = `/hiips360_test_${randomBytes(4).toString("hex")}`;
    return url.toString();
}

before(async () => {
    if (skip) return;
    process.env.MONGODB_URI = testUri();
    process.env.SESSION_SECRET ||= "test-secret";
    mongoose = (await import("mongoose")).default;
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const { applySchema } = await import("../../server/db/setup.js");
    await applySchema();
    ({ default: Job } = await import("../../server/models/Job.js"));
    ({ default: Photo } = await import("../../server/models/Photo.js"));
    ({ LIMITS } = await import("../../server/db/limits.js"));
    const { createApp } = await import("../../server/app.js");
    server = createApp().listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
    if (skip) return;
    server?.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

// A signed-in officer: a fetch that keeps its session cookie
async function officer(name = "Officer") {
    let cookie = "";
    const call = async (method, path, body, headers) => {
        const isForm = body instanceof FormData;
        const res = await fetch(base + path, {
            method,
            headers: { ...headers, ...(cookie && { cookie }), ...(body && !isForm && { "content-type": "application/json" }) },
            body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
        });
        const set = res.headers.get("set-cookie");
        if (set) cookie = set.split(";")[0];
        const type = res.headers.get("content-type") ?? "";
        const data = type.includes("json") ? await res.json() : Buffer.from(await res.arrayBuffer());
        return { status: res.status, data, headers: res.headers };
    };
    const email = `${name.toLowerCase()}-${randomBytes(3).toString("hex")}@example.com`;
    const reg = await call("POST", "/auth/register", { name, email, password: "a-long-password-1" });
    assert.equal(reg.status, 201, JSON.stringify(reg.data));
    return call;
}

function photoForm(count = 1, { type = "image/jpeg", bytes = 2048 } = {}) {
    const form = new FormData();
    for (let i = 0; i < count; i++) form.append("photos", new Blob([new Uint8Array(bytes).fill(i)], { type }), `p${i}.jpg`);
    return form;
}

async function newJob(call, label = `Site ${randomBytes(3).toString("hex")}`) {
    const res = await call("POST", "/jobs", { label });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    return res.data.job;
}

// ---------- jobs ----------

test("DB-01 a new job has every field the app reads, and no userId leaves the API", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call, "  Oak   St. yard ");
    assert.equal(job.label, "Oak St. yard");
    assert.deepEqual(
        [job.sheetIds, job.checklist, job.visitNotes, job.visitNotesUpdatedAt, job.hazards],
        [[], {}, "", null, []],
    );
    assert.match(job.id, /^[0-9a-f]{24}$/);
    assert.equal(job.userId, undefined);
    assert.equal(job._id, undefined);
    assert.equal(job.finishedAt, null, "a new inspection is open");
});

test("DB-02 the same label in another case reopens the job instead of making a second one", { skip }, async () => {
    const call = await officer();
    const first = await newJob(call, "Mill Road");
    const again = await call("POST", "/jobs", { label: "mill ROAD" });
    assert.equal(again.status, 200);
    assert.equal(again.data.job.id, first.id);
    assert.equal((await call("GET", "/jobs")).data.jobs.length, 1);
});

test("DB-03 two requests for the same new label at once still make one job", { skip }, async () => {
    const call = await officer();
    const results = await Promise.all(Array.from({ length: 5 }, () => call("POST", "/jobs", { label: "Race Site" })));
    assert.ok(results.every((r) => r.status === 200 || r.status === 201), results.map((r) => r.status).join());
    assert.equal(new Set(results.map((r) => r.data.job.id)).size, 1);
    assert.equal((await call("GET", "/jobs")).data.jobs.length, 1);
});

test("DB-04 two officers can each have a job with the same label", { skip }, async () => {
    const a = await officer("A");
    const b = await officer("B");
    const ja = await newJob(a, "Shared Name");
    const jb = await newJob(b, "Shared Name");
    assert.notEqual(ja.id, jb.id);
});

test("DB-05 the job list is newest-opened first, and opening moves a job to the top", { skip }, async () => {
    const call = await officer();
    const one = await newJob(call, "One");
    await newJob(call, "Two");
    await newJob(call, "Three");
    assert.deepEqual((await call("GET", "/jobs")).data.jobs.map((j) => j.label), ["Three", "Two", "One"]);
    const opened = await call("POST", `/jobs/${one.id}/open`);
    assert.equal(opened.status, 200);
    const list = (await call("GET", "/jobs")).data.jobs;
    assert.deepEqual(list.map((j) => j.label), ["One", "Three", "Two"]);
    assert.equal(list[0].hazards, undefined, "the list leaves the hazards out");
});

test("DB-06 empty or too-long labels are refused", { skip }, async () => {
    const call = await officer();
    assert.equal((await call("POST", "/jobs", { label: "   " })).status, 400);
    assert.equal((await call("POST", "/jobs", { label: "x".repeat(LIMITS.labelChars + 1) })).status, 400);
    assert.equal((await call("POST", "/jobs", {})).status, 400);
});

// ---------- ownership ----------

test("DB-07 another officer gets 404 for every route on my job, hazard and photo, and changes nothing", { skip }, async () => {
    const me = await officer("Me");
    const other = await officer("Other");
    const job = await newJob(me, "Mine");
    const { data } = await me("POST", `/jobs/${job.id}/hazards`, { name: "Mine only" });
    const hazardId = data.hazardId;
    const up = await me("POST", `/jobs/${job.id}/hazards/${hazardId}/photos`, photoForm(1));
    const photoId = up.data.job.hazards[0].photoIds[0];
    const j = `/jobs/${job.id}`;
    const h = `${j}/hazards/${hazardId}`;

    const attempts = [
        ["GET", j], ["POST", `${j}/open`], ["PUT", `${j}/sheets`, { sheetIds: [LOG] }],
        ["PUT", `${j}/visit-notes`, { visitNotes: "x" }], ["POST", `${j}/hazards`, { name: "Sneaky" }],
        ["PATCH", h, { comment: "x" }], ["POST", `${h}/photos`, photoForm(1)], ["DELETE", `${h}/photos/${photoId}`],
        ["DELETE", h], ["GET", `/photos/${photoId}`], ["POST", `${j}/finish`], ["DELETE", j],
    ];
    for (const [method, path, body] of attempts) {
        const res = await other(method, path, body);
        assert.equal(res.status, 404, `${method} ${path} gave ${res.status}`);
    }
    const after = (await me("GET", j)).data.job;
    assert.deepEqual(after, { ...after, label: "Mine", sheetIds: [], visitNotes: "", finishedAt: null });
    assert.equal(after.hazards.length, 1);
    assert.equal(after.hazards[0].comment, "");
    assert.equal((await me("GET", `/photos/${photoId}`)).status, 200);
    assert.deepEqual((await other("GET", "/jobs")).data.jobs, []);
});

test("DB-08 signed out gets 401, and ids that aren't ObjectIds get 404", { skip }, async () => {
    const res = await fetch(`${base}/jobs`);
    assert.equal(res.status, 401);
    const call = await officer();
    assert.equal((await call("GET", "/jobs/not-an-id")).status, 404);
    assert.equal((await call("GET", "/photos/123")).status, 404);
});

// ---------- sheet sync ----------

test("DB-09 picking Log Transport loads its 40 hazards in sheet order", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const res = await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] });
    assert.equal(res.status, 200);
    const { hazards } = res.data.job;
    assert.deepEqual(res.data.job.sheetIds, [LOG]);
    assert.equal(hazards.length, 40);
    assert.ok(hazards.every((h) => h.source === "sheet" && h.sheetId === LOG && h.sheetKey && h.id));
    assert.equal(new Set(hazards.map((h) => h.sheetKey)).size, 40);
    assert.equal(hazards[0].sheetKey, "cu-732044-010");
    assert.equal(hazards[0].stage, undefined, "the stage is read from the sheet, not stored");
});

test("DB-10 picking the same sheet again adds nothing and keeps the hazard ids", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const first = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] })).data.job;
    const second = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] })).data.job;
    assert.deepEqual(second.hazards.map((h) => h.id), first.hazards.map((h) => h.id));
});

test("DB-11 changing sheet keeps worked-on hazards and the officer's own, drops untouched ones", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const loaded = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] })).data.job.hazards;
    const [commented, withPhoto, marked] = loaded;
    await call("PATCH", `/jobs/${job.id}/hazards/${commented.id}`, { comment: "Seen at gate" });
    await call("POST", `/jobs/${job.id}/hazards/${withPhoto.id}/photos`, photoForm(1));
    await call("PATCH", `/jobs/${job.id}/hazards/${marked.id}`, { notApplicable: true });
    const own = (await call("POST", `/jobs/${job.id}/hazards`, { name: "Loose ladder" })).data.hazardId;

    const changed = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LTC] })).data.job;
    const ids = changed.hazards.map((h) => h.id);
    for (const keep of [commented.id, withPhoto.id, marked.id, own]) assert.ok(ids.includes(keep));
    assert.equal(changed.hazards.filter((h) => h.sheetId === LOG).length, 3);
    assert.equal(changed.hazards.filter((h) => h.sheetId === LTC).length, 14);
    assert.equal(changed.hazards.length, 3 + 1 + 14);

    const cleared = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [] })).data.job;
    assert.deepEqual(cleared.sheetIds, []);
    assert.equal(cleared.hazards.length, 4);
});

test("DB-12 an unknown sheet is refused", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    assert.equal((await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: ["cu-000000"] })).status, 400);
    assert.equal((await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [5] })).status, 400);
});

test("DB-13 sheet changes racing a comment edit never lose the comment or duplicate hazards", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const loaded = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] })).data.job.hazards;
    // Sheet switches and comment edits all at once. A comment the server said it saved must survive:
    // a sync that read the job before the comment and wrote after it would wipe it out.
    const sheets = Array.from({ length: 8 }, (_, i) => call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [i % 2 ? LOG : LTC] }));
    const edits = loaded.slice(0, 20).map((h, i) => call("PATCH", `/jobs/${job.id}/hazards/${h.id}`, { comment: `Note ${i}` }).then((r) => ({ r, h, i })));
    await Promise.all(sheets);
    const saved = (await Promise.all(edits)).filter(({ r }) => r.status === 200);

    const final = (await call("GET", `/jobs/${job.id}`)).data.job;
    const keys = final.hazards.filter((h) => h.source === "sheet").map((h) => `${h.sheetId}/${h.sheetKey}`);
    assert.equal(new Set(keys).size, keys.length, "no sheet hazard twice");
    for (const { h, i } of saved) {
        assert.equal(final.hazards.find((x) => x.id === h.id)?.comment, `Note ${i}`, `saved comment ${i} was lost`);
    }
});

test("DB-13b a change made between the sheet sync's read and its write is not overwritten", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const target = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] })).data.job.hazards[0];

    // The first time the route reads the job, a comment lands right after the read, before the write
    const realFindOne = Job.findOne;
    let sneaked = false;
    Job.findOne = function patchedFindOne(...args) {
        const query = realFindOne.apply(this, args);
        const exec = query.exec.bind(query);
        query.exec = async (...a) => {
            const result = await exec(...a);
            if (!sneaked) {
                sneaked = true;
                await Job.updateOne({ _id: job.id, "hazards._id": target.id }, { $set: { "hazards.$.comment": "Sneaked in" } });
            }
            return result;
        };
        return query;
    };
    try {
        assert.equal((await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LTC] })).status, 200);
    } finally {
        Job.findOne = realFindOne;
    }
    assert.ok(sneaked);
    const kept = (await call("GET", `/jobs/${job.id}`)).data.job.hazards.find((h) => h.id === target.id);
    assert.equal(kept?.comment, "Sneaked in", "the sync redid its work on the fresh copy, so the commented hazard stays");
});

test("DB-12b two sheets load together with no hazard twice, and removing one keeps the other's", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const both = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG, LTC, LOG] })).data.job;
    assert.deepEqual(both.sheetIds, [LOG, LTC], "a repeated sheet counts once");
    const ltcNames = new Set(both.hazards.filter((h) => h.sheetId === LTC).map((h) => h.name.toLowerCase()));
    assert.ok(both.hazards.filter((h) => h.sheetId === LOG).every((h) => !ltcNames.has(h.name.toLowerCase())), "no hazard from both sheets");
    assert.equal(both.hazards.filter((h) => h.sheetId === LOG).length, 40);
    assert.ok(both.hazards.some((h) => h.sheetId === LTC));

    const ltcOnly = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LTC] })).data.job;
    assert.deepEqual(ltcOnly.sheetIds, [LTC]);
    assert.equal(ltcOnly.hazards.length, 14);
    assert.ok(ltcOnly.hazards.every((h) => h.sheetId === LTC));
});

test("DB-12c the sheet list is checked: a list, known sheets, at most LIMITS.sheetsPerJob", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    assert.equal((await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: LOG })).status, 400);
    assert.equal((await call("PUT", `/jobs/${job.id}/sheets`, {})).status, 400);
    const tooMany = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG, LTC, "cu-761030", "cu-763025"] })).status;
    assert.equal(tooMany, LIMITS.sheetsPerJob >= 4 ? 200 : 400);
});

test("DB-12d a job saved with the old single sheetId reads as sheetIds and still takes checklist answers", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    await Job.updateOne({ _id: job.id }, { $set: { sheetId: LOG }, $unset: { sheetIds: "" } });
    const old = (await call("GET", `/jobs/${job.id}`)).data.job;
    assert.deepEqual(old.sheetIds, [LOG]);
    assert.equal(old.sheetId, undefined);
    assert.equal((await call("PUT", `/jobs/${job.id}/checklist/cu-732044-062-1`, { status: "ready" })).status, 200);
    const changed = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG, LTC] })).data.job;
    assert.deepEqual(changed.sheetIds, [LOG, LTC]);
    const raw = await Job.findById(job.id).lean();
    assert.equal(raw.sheetId, undefined, "the old field is removed on the first change");
});

// ---------- checklist and visit notes ----------

test("DB-14 checklist: ready and not-applicable are saved, pending removes the entry", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] });
    const item = "cu-732044-062-1";
    let res = await call("PUT", `/jobs/${job.id}/checklist/${item}`, { status: "ready" });
    assert.deepEqual(res.data.job.checklist, { [item]: "ready" });
    res = await call("PUT", `/jobs/${job.id}/checklist/${item}`, { status: "not-applicable" });
    assert.deepEqual(res.data.job.checklist, { [item]: "not-applicable" });
    res = await call("PUT", `/jobs/${job.id}/checklist/${item}`, { status: "pending" });
    assert.deepEqual(res.data.job.checklist, {});
});

test("DB-15 checklist refuses unknown statuses and items that aren't on the job's sheet", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    assert.equal((await call("PUT", `/jobs/${job.id}/checklist/cu-732044-062-1`, { status: "ready" })).status, 400, "no sheet yet");
    await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] });
    assert.equal((await call("PUT", `/jobs/${job.id}/checklist/cu-732044-062-1`, { status: "done" })).status, 400);
    assert.equal((await call("PUT", `/jobs/${job.id}/checklist/cu-766011-016-1`, { status: "ready" })).status, 400);
    // ...until that sheet is on the job too
    await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG, LTC] });
    assert.equal((await call("PUT", `/jobs/${job.id}/checklist/cu-766011-016-1`, { status: "ready" })).status, 200);
    assert.equal((await call("PUT", `/jobs/${job.id}/checklist/$where`, { status: "ready" })).status, 400);
});

test("DB-16 visit notes are saved with the time, and the length limit holds", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const res = await call("PUT", `/jobs/${job.id}/visit-notes`, { visitNotes: "Gate code 4411" });
    assert.equal(res.data.job.visitNotes, "Gate code 4411");
    assert.ok(res.data.job.visitNotesUpdatedAt);
    assert.equal((await call("PUT", `/jobs/${job.id}/visit-notes`, { visitNotes: "x".repeat(LIMITS.visitNotesChars + 1) })).status, 400);
    assert.equal((await call("PUT", `/jobs/${job.id}/visit-notes`, { visitNotes: 5 })).status, 400);
});

// ---------- hazards ----------

test("DB-17 log, edit, mark not applicable and delete a hazard", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const created = await call("POST", `/jobs/${job.id}/hazards`, { name: " Unsecured load binder ", comment: "Truck 12" });
    assert.equal(created.status, 201);
    const h = created.data.job.hazards.find((x) => x.id === created.data.hazardId);
    assert.deepEqual([h.source, h.name, h.comment, h.notApplicable, h.photoIds], ["officer", "Unsecured load binder", "Truck 12", false, []]);
    assert.equal(h.sheetId, undefined);

    const edited = await call("PATCH", `/jobs/${job.id}/hazards/${h.id}`, { comment: "Truck 12\nAlso truck 4", notApplicable: true });
    const e = edited.data.job.hazards[0];
    assert.deepEqual([e.comment, e.notApplicable], ["Truck 12\nAlso truck 4", true]);

    const deleted = await call("DELETE", `/jobs/${job.id}/hazards/${h.id}`);
    assert.deepEqual(deleted.data.job.hazards, []);
    assert.equal((await call("DELETE", `/jobs/${job.id}/hazards/${h.id}`)).status, 404);
});

test("DB-18 hazard input rules: name required and capped, comment capped, notApplicable boolean", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    assert.equal((await call("POST", `/jobs/${job.id}/hazards`, { name: "" })).status, 400);
    assert.equal((await call("POST", `/jobs/${job.id}/hazards`, { name: "x".repeat(LIMITS.hazardNameChars + 1) })).status, 400);
    assert.equal((await call("POST", `/jobs/${job.id}/hazards`, { name: "ok", comment: "x".repeat(LIMITS.commentChars + 1) })).status, 400);
    const id = (await call("POST", `/jobs/${job.id}/hazards`, { name: "ok" })).data.hazardId;
    assert.equal((await call("PATCH", `/jobs/${job.id}/hazards/${id}`, { notApplicable: "yes" })).status, 400);
    assert.equal((await call("PATCH", `/jobs/${job.id}/hazards/${id}`, {})).status, 400);
});

test(`DB-19 a job holds at most the hazard limit, even when the requests race`, { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    // Fill to one under the limit directly, then race several requests for the last slot
    const filler = Array.from({ length: LIMITS.hazardsPerJob - 1 }, (_, i) => ({
        _id: new mongoose.Types.ObjectId(), source: "officer", name: `H${i}`, comment: "", notApplicable: false, photoIds: [], createdAt: new Date(),
    }));
    await Job.updateOne({ _id: job.id }, { $set: { hazards: filler } });
    const results = await Promise.all(Array.from({ length: 4 }, (_, i) => call("POST", `/jobs/${job.id}/hazards`, { name: `Last ${i}` })));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.ok(results.filter((r) => r.status !== 201).every((r) => r.status === 400));
    assert.equal((await call("GET", `/jobs/${job.id}`)).data.job.hazards.length, LIMITS.hazardsPerJob);
});

// ---------- photos ----------

test("DB-20 photos: upload, read back the same bytes, delete one", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const id = (await call("POST", `/jobs/${job.id}/hazards`, { name: "Ladder" })).data.hazardId;
    const up = await call("POST", `/jobs/${job.id}/hazards/${id}/photos`, photoForm(2, { bytes: 4096 }));
    assert.equal(up.status, 201);
    const [p1, p2] = up.data.job.hazards[0].photoIds;

    const got = await call("GET", `/photos/${p1}`);
    assert.equal(got.status, 200);
    assert.equal(got.headers.get("content-type"), "image/jpeg");
    assert.match(got.headers.get("cache-control"), /private/);
    assert.equal(got.data.length, 4096);

    const del = await call("DELETE", `/jobs/${job.id}/hazards/${id}/photos/${p1}`);
    assert.deepEqual(del.data.job.hazards[0].photoIds, [p2]);
    assert.equal((await call("GET", `/photos/${p1}`)).status, 404);
    assert.equal(await Photo.countDocuments({ hazardId: id }), 1);
});

test("DB-20b the browser must ask the server for every photo view, so its cache can't bypass ownership", { skip }, async () => {
    const owner = await officer("Owner");
    const other = await officer("Other");
    const job = await newJob(owner);
    const id = (await owner("POST", `/jobs/${job.id}/hazards`, { name: "Ladder" })).data.hazardId;
    const up = await owner("POST", `/jobs/${job.id}/hazards/${id}/photos`, photoForm(1, { bytes: 4096 }));
    const [photoId] = up.data.job.hazards[0].photoIds;

    const first = await owner("GET", `/photos/${photoId}`);
    const cacheControl = first.headers.get("cache-control");
    assert.match(cacheControl, /no-cache/);
    assert.doesNotMatch(cacheControl, /max-age|immutable/);
    const etag = first.headers.get("etag");
    assert.ok(etag, "an ETag lets the owner's repeat views skip the download");

    // What a browser sends when it checks its copy. Without the cache-control, Node's fetch adds no-cache for a full reload.
    const repeat = await owner("GET", `/photos/${photoId}`, undefined, { "if-none-match": etag, "cache-control": "max-age=0" });
    assert.equal(repeat.status, 304);
    assert.equal(repeat.data.length, 0);

    assert.equal((await other("GET", `/photos/${photoId}`, undefined, { "if-none-match": etag })).status, 404);

    await owner("DELETE", `/jobs/${job.id}/hazards/${id}/photos/${photoId}`);
    assert.equal((await owner("GET", `/photos/${photoId}`, undefined, { "if-none-match": etag })).status, 404);
});

test("DB-21 photo rules: type, size, count and at least one", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const id = (await call("POST", `/jobs/${job.id}/hazards`, { name: "Ladder" })).data.hazardId;
    const url = `/jobs/${job.id}/hazards/${id}/photos`;
    assert.equal((await call("POST", url, photoForm(1, { type: "image/gif" }))).status, 400);
    assert.equal((await call("POST", url, photoForm(1, { bytes: LIMITS.photoBytes + 1 }))).status, 400);
    assert.equal((await call("POST", url, new FormData())).status, 400);
    assert.equal((await call("POST", url, photoForm(LIMITS.photosPerHazard + 1))).status, 400);

    assert.equal((await call("POST", url, photoForm(LIMITS.photosPerHazard - 1))).status, 201);
    assert.equal((await call("POST", url, photoForm(2))).status, 400, "over the limit in total");
    assert.equal((await call("POST", url, photoForm(1))).status, 201);
    assert.equal(await Photo.countDocuments({ hazardId: id }), LIMITS.photosPerHazard, "no photo saved without a place on the hazard");
});

test("DB-22 photo uploads racing for the last slots never go over the limit or leave stray photos", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const id = (await call("POST", `/jobs/${job.id}/hazards`, { name: "Ladder" })).data.hazardId;
    const url = `/jobs/${job.id}/hazards/${id}/photos`;
    await call("POST", url, photoForm(LIMITS.photosPerHazard - 2));
    await Promise.all(Array.from({ length: 4 }, () => call("POST", url, photoForm(2))));
    const hazard = (await call("GET", `/jobs/${job.id}`)).data.job.hazards[0];
    assert.equal(hazard.photoIds.length, LIMITS.photosPerHazard);
    assert.equal(await Photo.countDocuments({ hazardId: id }), LIMITS.photosPerHazard);
});

test("DB-23 deleting a hazard or a job deletes its photos", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const a = (await call("POST", `/jobs/${job.id}/hazards`, { name: "A" })).data.hazardId;
    const b = (await call("POST", `/jobs/${job.id}/hazards`, { name: "B" })).data.hazardId;
    await call("POST", `/jobs/${job.id}/hazards/${a}/photos`, photoForm(2));
    await call("POST", `/jobs/${job.id}/hazards/${b}/photos`, photoForm(3));

    await call("DELETE", `/jobs/${job.id}/hazards/${a}`);
    assert.equal(await Photo.countDocuments({ jobId: job.id }), 3);
    assert.equal((await call("DELETE", `/jobs/${job.id}`)).status, 204);
    assert.equal(await Photo.countDocuments({ jobId: job.id }), 0);
    assert.equal((await call("GET", `/jobs/${job.id}`)).status, 404);
});

test("DB-23b sheet hazards can't be deleted, officer hazards can", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const loaded = (await call("PUT", `/jobs/${job.id}/sheets`, { sheetIds: [LOG] })).data.job.hazards;
    const sheetHazard = loaded.find((h) => h.source === "sheet");

    const refused = await call("DELETE", `/jobs/${job.id}/hazards/${sheetHazard.id}`);
    assert.equal(refused.status, 403);
    assert.match(refused.data.error, /not applicable/);
    const after = (await call("GET", `/jobs/${job.id}`)).data.job.hazards;
    assert.equal(after.length, loaded.length);

    // Another officer still gets 404, not 403
    const other = await officer();
    assert.equal((await other("DELETE", `/jobs/${job.id}/hazards/${sheetHazard.id}`)).status, 404);

    const mine = (await call("POST", `/jobs/${job.id}/hazards`, { name: "Mine" })).data.hazardId;
    assert.equal((await call("DELETE", `/jobs/${job.id}/hazards/${mine}`)).status, 200);
});

// ---------- recent sheets ----------

test("DB-24 recent sheets: newest first, no repeats, at most the limit, unknown sheets refused", { skip }, async () => {
    const call = await officer();
    assert.deepEqual((await call("GET", "/me/recent-sheets")).data.recentSheetIds, []);
    for (const id of [LOG, LTC, "cu-761030", LOG, "cu-763025"]) await call("POST", "/me/recent-sheets", { sheetId: id });
    assert.deepEqual((await call("GET", "/me/recent-sheets")).data.recentSheetIds, ["cu-763025", LOG, "cu-761030"]);
    assert.equal((await call("POST", "/me/recent-sheets", { sheetId: "nope" })).status, 400);
    const other = await officer("Other");
    assert.deepEqual((await other("GET", "/me/recent-sheets")).data.recentSheetIds, [], "each officer has their own");
});

// ---------- the database's own rules ----------

test("DB-25 MongoDB's validator refuses bad documents even when the app's checks are skipped", { skip }, async () => {
    const userId = new mongoose.Types.ObjectId();
    const good = {
        userId, label: "Direct", sheetId: null, checklist: {}, visitNotes: "", visitNotesUpdatedAt: null, hazards: [],
        lastOpenedAt: new Date(), rev: 0, createdAt: new Date(), updatedAt: new Date(),
    };
    const jobs = Job.collection;
    await jobs.insertOne({ ...good });
    // finishedAt is optional (jobs saved before FEAT-7 don't have it), and a date or null when it's there
    await jobs.insertOne({ ...good, label: "Finished", finishedAt: new Date() });
    await jobs.insertOne({ ...good, label: "Open", finishedAt: null });
    const hazard = { _id: new mongoose.Types.ObjectId(), source: "officer", name: "x", comment: "", notApplicable: false, photoIds: [], createdAt: new Date() };
    const bad = [
        { ...good, label: "" },
        { ...good, label: "Extra", extra: 1 },
        { ...good, label: "C", checklist: { a: "done" } },
        { ...good, label: "D", hazards: [{ ...hazard, source: "sheet" }] },
        { ...good, label: "E", hazards: [{ ...hazard, sheetId: LOG, sheetKey: "k" }] },
        { ...good, label: "F", hazards: [{ ...hazard, photoIds: Array.from({ length: LIMITS.photosPerHazard + 1 }, () => new mongoose.Types.ObjectId()) }] },
        { ...good, label: "G", visitNotes: "x".repeat(LIMITS.visitNotesChars + 1) },
        { ...good, label: "H", finishedAt: "yes" },
    ];
    for (const doc of bad) await assert.rejects(jobs.insertOne(doc), { code: 121 }, JSON.stringify(doc).slice(0, 80));
    await assert.rejects(jobs.insertOne({ ...good }), { code: 11000 }, "same label for the same officer");
    await assert.rejects(jobs.insertOne({ ...good, label: "DIRECT" }), { code: 11000 }, "case doesn't matter");
    await assert.rejects(
        Photo.collection.insertOne({ userId, jobId: userId, hazardId: userId, contentType: "image/gif", data: Buffer.from("x"), size: 1, createdAt: new Date() }),
        { code: 121 },
    );
});

// ---------- indexes and size ----------

test("DB-26 every route's query uses an index (IXSCAN), none scans the collection", { skip }, async () => {
    const userId = new mongoose.Types.ObjectId();
    const jobId = new mongoose.Types.ObjectId();
    const plans = {
        "list jobs": Job.find({ userId }).sort({ lastOpenedAt: -1 }),
        "my labels (new job, numbered visits)": Job.find({ userId }).select("label finishedAt lastOpenedAt"),
        "label lookup": Job.findOne({ userId, label: "x" }).collation({ locale: "en", strength: 2 }),
        "one job": Job.findOne({ _id: jobId, userId }),
        "one hazard": Job.findOne({ _id: jobId, userId, "hazards._id": jobId }),
        "job photos": Photo.find({ jobId }),
        "hazard photos": Photo.find({ jobId, hazardId: jobId }),
        "one photo": Photo.findOne({ _id: jobId, userId }),
    };
    for (const [name, query] of Object.entries(plans)) {
        const text = JSON.stringify((await query.explain("queryPlanner")).queryPlanner.winningPlan);
        assert.ok(/IXSCAN|IDHACK|EXPRESS/.test(text) && !text.includes("COLLSCAN"), `${name}: ${text.slice(0, 200)}`);
    }
});

test("DB-27 a worst-case job (every limit full) stays far under MongoDB's 16 MB document limit", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const ids = () => Array.from({ length: LIMITS.photosPerHazard }, () => new mongoose.Types.ObjectId());
    const hazards = Array.from({ length: LIMITS.hazardsPerJob }, (_, i) => ({
        _id: new mongoose.Types.ObjectId(), source: "sheet", sheetId: LOG, sheetKey: `k${i}`, name: "n".repeat(LIMITS.hazardNameChars),
        comment: "c".repeat(LIMITS.commentChars), notApplicable: false, photoIds: ids(), createdAt: new Date(),
    }));
    await Job.updateOne({ _id: job.id }, { $set: { hazards, visitNotes: "v".repeat(LIMITS.visitNotesChars) } });
    const [{ bytes }] = await Job.aggregate([{ $match: { _id: new mongoose.Types.ObjectId(job.id) } }, { $project: { bytes: { $bsonSize: "$$ROOT" } } }]);
    assert.ok(bytes < 2 * 1024 * 1024, `${bytes} bytes`);
});

// ---------- finishing an inspection (FEAT-7) ----------

const finish = (call, job) => call("POST", `/jobs/${job.id}/finish`);

test("DB-28 finishing is refused while a hazard is Unaddressed or a checklist item is To review", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const j = `/jobs/${job.id}`;
    const { hazards } = (await call("PUT", `${j}/sheets`, { sheetIds: [LOG] })).data.job;
    const checklist = getJobChecklist([LOG]);

    let res = await finish(call, job);
    assert.equal(res.status, 409);
    assert.equal(res.data.error, "This inspection can't be finished yet: 40 hazards are still Unaddressed and 13 checklist items are still To review.");

    // A photo on the first hazard, not applicable on all but the last, every checklist item but one answered
    await call("POST", `${j}/hazards/${hazards[0].id}/photos`, photoForm(1));
    for (const h of hazards.slice(1, -1)) await call("PATCH", `${j}/hazards/${h.id}`, { notApplicable: true });
    for (const item of checklist.slice(0, -1)) await call("PUT", `${j}/checklist/${item.id}`, { status: "ready" });
    res = await finish(call, job);
    assert.equal(res.data.error, "This inspection can't be finished yet: 1 hazard is still Unaddressed and 1 checklist item is still To review.");

    await call("PATCH", `${j}/hazards/${hazards.at(-1).id}`, { notApplicable: true });
    res = await finish(call, job);
    assert.equal(res.status, 409);
    assert.equal(res.data.error, "This inspection can't be finished yet: 1 checklist item is still To review.");
    assert.equal((await call("GET", j)).data.job.finishedAt, null, "nothing was finished");

    await call("PUT", `${j}/checklist/${checklist.at(-1).id}`, { status: "not-applicable" });
    assert.equal((await finish(call, job)).status, 200, "visit notes are optional");
});

test("DB-29 finishing saves the time once: the list shows it, finishing again changes nothing, opening still works", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    const j = `/jobs/${job.id}`;
    const id = (await call("POST", `${j}/hazards`, { name: "Ladder", comment: "Footing loose" })).data.hazardId;
    await call("POST", `${j}/hazards/${id}/photos`, photoForm(1));

    const done = await finish(call, job);
    assert.equal(done.status, 200);
    const { finishedAt } = done.data.job;
    assert.ok(!Number.isNaN(Date.parse(finishedAt)), finishedAt);
    assert.equal(done.data.job.hazards[0].comment, "Footing loose", "the whole job comes back");

    const again = await finish(call, job);
    assert.equal(again.status, 200, "a retry after a lost answer does no harm");
    assert.deepEqual(again.data.job, done.data.job);

    const listed = (await call("GET", "/jobs")).data.jobs.find((x) => x.id === job.id);
    assert.equal(listed.finishedAt, finishedAt);
    assert.equal((await call("POST", `${j}/open`)).status, 200);
    assert.equal((await call("GET", j)).data.job.finishedAt, finishedAt);
});

test("DB-30 a finished inspection is read-only: every change answers 423 and changes nothing", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call, "Locked yard");
    const j = `/jobs/${job.id}`;
    const id = (await call("POST", `${j}/hazards`, { name: "Ladder" })).data.hazardId;
    const h = `${j}/hazards/${id}`;
    const photoId = (await call("POST", `${h}/photos`, photoForm(1))).data.job.hazards[0].photoIds[0];
    await call("PUT", `${j}/visit-notes`, { visitNotes: "Before" });
    const finished = (await finish(call, job)).data.job;

    const attempts = [
        ["PUT", `${j}/sheets`, { sheetIds: [LOG] }], ["PUT", `${j}/sheets`, { sheetIds: [] }],
        ["PUT", `${j}/checklist/any-item`, { status: "ready" }], ["PUT", `${j}/visit-notes`, { visitNotes: "After" }],
        ["POST", `${j}/hazards`, { name: "Late" }], ["PATCH", h, { comment: "Changed", notApplicable: true }],
        ["POST", `${h}/photos`, photoForm(1)], ["DELETE", `${h}/photos/${photoId}`], ["DELETE", h], ["DELETE", j],
    ];
    for (const [method, path, body] of attempts) {
        const res = await call(method, path, body);
        assert.equal(res.status, 423, `${method} ${path} gave ${res.status}`);
        assert.match(res.data.error, /finished/);
    }
    assert.deepEqual((await call("GET", j)).data.job, finished, "not even rev or updatedAt moved");
    assert.equal(await Photo.countDocuments({ jobId: job.id }), 1, "no photo was saved or deleted");

    // Reading still works: the job, its photo, the list, and opening it
    assert.equal((await call("GET", `/photos/${photoId}`)).status, 200);
    assert.ok((await call("GET", "/jobs")).data.jobs.some((x) => x.id === job.id));
    assert.equal((await call("POST", `${j}/open`)).status, 200);
});

test("DB-31 another officer still gets 404, not 423, on my finished inspection", { skip }, async () => {
    const me = await officer("Me");
    const other = await officer("Other");
    const job = await newJob(me);
    const j = `/jobs/${job.id}`;
    const id = (await me("POST", `${j}/hazards`, { name: "Ladder" })).data.hazardId;
    const h = `${j}/hazards/${id}`;
    const photoId = (await me("POST", `${h}/photos`, photoForm(1))).data.job.hazards[0].photoIds[0];
    await finish(me, job);

    const attempts = [
        ["GET", j], ["POST", `${j}/finish`], ["PUT", `${j}/sheets`, { sheetIds: [] }],
        ["PUT", `${j}/checklist/any-item`, { status: "ready" }], ["PUT", `${j}/visit-notes`, { visitNotes: "x" }],
        ["POST", `${j}/hazards`, { name: "x" }], ["PATCH", h, { comment: "x" }], ["POST", `${h}/photos`, photoForm(1)],
        ["DELETE", `${h}/photos/${photoId}`], ["DELETE", h], ["DELETE", j],
    ];
    for (const [method, path, body] of attempts) {
        const res = await other(method, path, body);
        assert.equal(res.status, 404, `${method} ${path} gave ${res.status}: a 423 would say the job exists`);
    }
});

test("DB-32 a finished site's name starts a numbered visit, and a visit in progress reopens", { skip }, async () => {
    const call = await officer();
    const first = await newJob(call, "Oak St yard");
    await finish(call, first);

    const second = await call("POST", "/jobs", { label: "oak st YARD" });
    assert.equal(second.status, 201);
    assert.equal(second.data.job.label, "Oak St yard (2)", "numbered, with the first visit's capitals");
    assert.equal(second.data.job.finishedAt, null);

    // While visit 2 is open, either name reopens it
    for (const label of ["Oak St yard", "OAK ST YARD (2)"]) {
        const again = await call("POST", "/jobs", { label });
        assert.equal(again.status, 200, label);
        assert.equal(again.data.job.id, second.data.job.id, label);
    }

    await finish(call, second.data.job);
    const third = await call("POST", "/jobs", { label: "Oak St yard" });
    assert.equal(third.status, 201);
    assert.equal(third.data.job.label, "Oak St yard (3)");

    // A site that only starts the same way is its own site
    assert.equal((await call("POST", "/jobs", { label: "Oak St yard north" })).data.job.label, "Oak St yard north");

    const labels = (await call("GET", "/jobs")).data.jobs.map((x) => x.label).sort();
    assert.deepEqual(labels, ["Oak St yard", "Oak St yard (2)", "Oak St yard (3)", "Oak St yard north"]);
    // Another officer's site of the same name starts at visit 1
    assert.equal((await newJob(await officer("Other"), "Oak St yard")).label, "Oak St yard");
});

test("DB-33 adding a finished site's name from several requests at once starts one new visit", { skip }, async () => {
    const call = await officer();
    const first = await newJob(call, "Dock 4");
    await finish(call, first);
    const results = await Promise.all(Array.from({ length: 5 }, () => call("POST", "/jobs", { label: "dock 4" })));
    assert.ok(results.every((r) => r.status === 200 || r.status === 201), results.map((r) => r.status).join());
    assert.equal(new Set(results.map((r) => r.data.job.id)).size, 1);
    assert.equal(results[0].data.job.label, "Dock 4 (2)");
    assert.equal((await call("GET", "/jobs")).data.jobs.length, 2);
});

test("DB-34 a job saved before finishing existed reads as open, takes changes, and can be finished", { skip }, async () => {
    const call = await officer();
    const job = await newJob(call);
    // Bypasses Mongoose, so the document looks like one saved before FEAT-7: no finishedAt at all
    await Job.collection.updateOne({ _id: new mongoose.Types.ObjectId(job.id) }, { $unset: { finishedAt: "" } });
    assert.equal((await Job.collection.findOne({ _id: new mongoose.Types.ObjectId(job.id) })).finishedAt, undefined);

    const j = `/jobs/${job.id}`;
    assert.equal((await call("GET", j)).data.job.finishedAt, null);
    assert.equal((await call("GET", "/jobs")).data.jobs[0].finishedAt, null);
    assert.equal((await call("PUT", `${j}/visit-notes`, { visitNotes: "Still open" })).status, 200, "the validator doesn't require it");
    const done = await finish(call, job);
    assert.equal(done.status, 200);
    assert.ok(done.data.job.finishedAt);
});
