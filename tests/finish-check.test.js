// TEST-FINISH: what has to be done before an inspection can be finished (src/data/finishCheck.js, FEAT-7).
// The server's finish route and the app's review sheet both use it, so it is tested once here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { finishSummary, whatsLeft } from "../src/data/finishCheck.js";
import { getJobChecklist } from "../server/services/sheetCatalog.js";

const LOG = "cu-732044"; // Log Transport: 13 checklist items

const hazard = (fields = {}) => ({ name: "Ladder", comment: "", notApplicable: false, photoIds: [], ...fields });
const items = (...ids) => ids.map((id) => ({ id, group: "Before you go", label: id }));

test("FIN-01 nothing left: every hazard reviewed or not applicable, every checklist item answered", () => {
    const job = {
        hazards: [hazard({ photoIds: ["p1", "p2"] }), hazard({ notApplicable: true }), hazard({ photoIds: ["p3"] })],
        checklist: { a: "ready", b: "not-applicable" },
        visitNotes: "",
    };
    const summary = finishSummary(job, items("a", "b"));
    assert.equal(summary.canFinish, true);
    assert.deepEqual(summary.hazards, { total: 3, reviewed: 2, notApplicable: 1, unaddressed: 0 });
    assert.deepEqual(summary.checklist, { total: 2, done: 2, toReview: 0 });
    assert.equal(summary.photos, 3);
    assert.equal(summary.hasVisitNotes, false, "visit notes are optional");
    assert.deepEqual(whatsLeft(summary), []);
});

test("FIN-02 an Unaddressed hazard stops it, and says how many", () => {
    const summary = finishSummary({ hazards: [hazard(), hazard({ photoIds: ["p1"] })], checklist: {} }, []);
    assert.equal(summary.canFinish, false);
    assert.equal(summary.hazards.unaddressed, 1);
    assert.deepEqual(whatsLeft(summary), ["1 hazard is still Unaddressed"]);
});

test("FIN-03 a checklist item still To review stops it; answers for items not on the job don't count", () => {
    const job = { hazards: [], checklist: { a: "ready", "removed-sheet-item": "ready" } };
    const summary = finishSummary(job, items("a", "b", "c"));
    assert.equal(summary.canFinish, false);
    assert.deepEqual(summary.checklist, { total: 3, done: 1, toReview: 2 });
    assert.deepEqual(whatsLeft(summary), ["2 checklist items are still To review"]);
});

test("FIN-04 both at once are listed hazards first", () => {
    const summary = finishSummary({ hazards: [hazard(), hazard()], checklist: {} }, items("a"));
    assert.deepEqual(whatsLeft(summary), ["2 hazards are still Unaddressed", "1 checklist item is still To review"]);
});

test("FIN-05 the app's hazards (photo URLs and drafts) and the server's (photo ids) count the same", () => {
    const fromServer = finishSummary({ hazards: [hazard({ photoIds: ["p1"] }), hazard({ notApplicable: true })] }, []);
    const inApp = finishSummary({ hazards: [{ ...hazard(), photos: ["/api/photos/p1"] }, { ...hazard(), photos: [], notApplicable: true }] }, []);
    assert.deepEqual(inApp, fromServer);
    // Not applicable wins over a photo, as everywhere else (hazardStatus.js)
    const both = finishSummary({ hazards: [hazard({ notApplicable: true, photoIds: ["p1"] })] }, []);
    assert.deepEqual(both.hazards, { total: 1, reviewed: 0, notApplicable: 1, unaddressed: 0 });
});

test("FIN-06 a Mongoose Map checklist reads like a plain object", () => {
    const summary = finishSummary({ hazards: [], checklist: new Map([["a", "ready"]]) }, items("a", "b"));
    assert.deepEqual(summary.checklist, { total: 2, done: 1, toReview: 1 });
});

test("FIN-07 a real sheet: Log Transport's checklist must be answered in full", () => {
    const checklist = getJobChecklist([LOG]);
    assert.equal(checklist.length, 13);
    const answered = Object.fromEntries(checklist.slice(0, 12).map((item) => [item.id, "ready"]));
    assert.equal(finishSummary({ hazards: [], checklist: answered }, checklist).checklist.toReview, 1);
    answered[checklist[12].id] = "not-applicable";
    assert.equal(finishSummary({ hazards: [], checklist: answered }, checklist).canFinish, true);
});

test("FIN-08 an empty or missing job has nothing left, and visit notes are noticed when there are some", () => {
    assert.equal(finishSummary(null, []).canFinish, true);
    assert.equal(finishSummary({ visitNotes: "  Gate code 4411 " }, []).hasVisitNotes, true);
    assert.equal(finishSummary({ visitNotes: "   " }, []).hasVisitNotes, false);
});
