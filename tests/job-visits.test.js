// TEST-VISITS: coming back to a job site after its inspection was finished (src/data/jobVisits.js, FEAT-7).
// The server's POST /api/jobs and the Jobs page's note both use it, so it is tested once here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLabel, planNewJob, sameLabel, splitVisit, visitsTo } from "../src/data/jobVisits.js";

let n = 0;
const job = (label, fields = {}) => ({ id: `j${++n}`, label, finishedAt: null, lastOpenedAt: "2026-11-01T10:00:00Z", ...fields });
const finished = (label, fields = {}) => job(label, { finishedAt: "2026-10-14T20:00:00Z", ...fields });

test("VIS-01 a label splits into the site and its visit number", () => {
    assert.deepEqual(splitVisit("Oak St yard"), { base: "Oak St yard", visit: 1 });
    assert.deepEqual(splitVisit("Oak St yard (2)"), { base: "Oak St yard", visit: 2 });
    assert.deepEqual(splitVisit("Oak St yard (12)"), { base: "Oak St yard", visit: 12 });
    // Not a visit number: "(1)", no space before it, or nothing before it
    assert.deepEqual(splitVisit("Oak St yard (1)"), { base: "Oak St yard (1)", visit: 1 });
    assert.deepEqual(splitVisit("Unit(2)"), { base: "Unit(2)", visit: 1 });
    assert.deepEqual(splitVisit("(2)"), { base: "(2)", visit: 1 });
});

test("VIS-02 labels match like the database's index: case doesn't count, accents do", () => {
    assert.equal(sameLabel("Oak St yard", "OAK st YARD"), true);
    assert.equal(sameLabel("Café Row", "café row"), true);
    assert.equal(sameLabel("Café Row", "Cafe Row"), false);
    assert.equal(cleanLabel("  Oak   St.  yard "), "Oak St. yard");
    assert.equal(cleanLabel(5), "");
});

test("VIS-03 a new site is created as typed", () => {
    assert.deepEqual(planNewJob("Mill Road", [job("Oak St yard")]), { create: "Mill Road", after: null });
    assert.deepEqual(planNewJob("Mill Road", []), { create: "Mill Road", after: null });
});

test("VIS-04 a site still in progress reopens, in any case", () => {
    const oak = job("Oak St yard");
    assert.equal(planNewJob("oak st YARD", [job("Mill Road"), oak]).reopen, oak);
});

test("VIS-05 when every visit is finished, the next one gets the next number, with the first visit's capitals", () => {
    const first = finished("Oak St yard");
    assert.deepEqual(planNewJob("oak st yard", [first]), { create: "Oak St yard (2)", after: first });

    const second = finished("Oak St yard (2)", { finishedAt: "2026-11-03T20:00:00Z" });
    assert.deepEqual(planNewJob("OAK ST YARD", [second, first]), { create: "Oak St yard (3)", after: second });
    // Typing the numbered label counts as the same site
    assert.equal(planNewJob("Oak St yard (2)", [second, first]).create, "Oak St yard (3)");
});

test("VIS-06 a visit still in progress reopens instead of starting another, whichever label is typed", () => {
    const first = finished("Riverside depot");
    const second = job("Riverside depot (2)");
    assert.equal(planNewJob("Riverside depot", [first, second]).reopen, second);
    assert.equal(planNewJob("riverside depot (2)", [first, second]).reopen, second);
    assert.equal(planNewJob("Riverside depot (5)", [first, second]).reopen, second);
});

test("VIS-07 with more than one open visit (saved before this rule), the exact label wins, then the newest opened", () => {
    const older = job("Dock 4", { lastOpenedAt: "2026-11-01T10:00:00Z" });
    const newer = job("Dock 4 (2)", { lastOpenedAt: "2026-11-20T10:00:00Z" });
    assert.equal(planNewJob("dock 4", [newer, older]).reopen, older);
    assert.equal(planNewJob("Dock 4 (3)", [older, newer]).reopen, newer);
});

test("VIS-08 other sites that only start the same way don't count", () => {
    const visits = visitsTo("Oak St yard", [finished("Oak St yard north"), finished("Oak St"), job("Oak St yard (2) annex")]);
    assert.deepEqual(visits, []);
    assert.deepEqual(planNewJob("Oak St yard", [finished("Oak St yard north")]), { create: "Oak St yard", after: null });
});

test("VIS-09 the next number follows the highest visit, even with a gap", () => {
    const visits = [finished("Pier 9"), finished("Pier 9 (4)")];
    assert.equal(planNewJob("Pier 9", visits).create, "Pier 9 (5)");
    assert.deepEqual(visitsTo("pier 9", visits).map((v) => v.visit), [1, 4]);
});
