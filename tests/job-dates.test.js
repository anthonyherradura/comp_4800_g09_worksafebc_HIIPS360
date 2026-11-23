// TEST-DATES: the dates on the Jobs page and on a finished inspection (src/data/recentSheets.js, FEAT-7).
// "Started Nov 20 · Last opened 2 days ago", "Finished today, 1:05 PM", "finished on Oct 14, 2026".
// Times are local; the expected strings are built the same way, so the test passes in any time zone and locale.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDay, formatFullDay, formatFullDayTime, formatWhen } from "../src/data/recentSheets.js";

const at = (y, m, d, h = 13, min = 5) => new Date(y, m - 1, d, h, min);
const NOW = at(2026, 11, 22, 16, 30);
const day = (date, year) => date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(year && { year: "numeric" }) });
const time = (date) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

test("DATE-01 today and yesterday give the time, in lower case for the middle of a sentence", () => {
    const today = at(2026, 11, 22, 9, 15);
    assert.equal(formatWhen(today.toISOString(), NOW), `today, ${time(today)}`);
    const yesterday = at(2026, 11, 21, 23, 59);
    assert.equal(formatWhen(yesterday.toISOString(), NOW), `yesterday, ${time(yesterday)}`);
    // Just after midnight still counts by the calendar, not by 24 hours
    assert.equal(formatWhen(at(2026, 11, 21, 23, 0).toISOString(), at(2026, 11, 22, 0, 30)).startsWith("yesterday"), true);
});

test("DATE-02 a few days back says how many, the week before says last week, older gives the day", () => {
    assert.equal(formatWhen(at(2026, 11, 20).toISOString(), NOW), "2 days ago");
    assert.equal(formatWhen(at(2026, 11, 16).toISOString(), NOW), "6 days ago");
    assert.equal(formatWhen(at(2026, 11, 15).toISOString(), NOW), "last week");
    assert.equal(formatWhen(at(2026, 11, 9).toISOString(), NOW), "last week");
    const older = at(2026, 11, 8);
    assert.equal(formatWhen(older.toISOString(), NOW), day(older));
});

test("DATE-03 the day leaves out the year only when it is this year", () => {
    const thisYear = at(2026, 10, 14);
    const lastYear = at(2025, 12, 30);
    assert.equal(formatDay(thisYear.toISOString(), NOW), day(thisYear));
    assert.equal(formatDay(lastYear.toISOString(), NOW), day(lastYear, true));
    assert.equal(formatWhen(lastYear.toISOString(), NOW), day(lastYear, true));
    assert.equal(formatFullDay(thisYear.toISOString()), day(thisYear, true), "a record always has the year");
    assert.equal(formatFullDayTime(thisYear.toISOString()), `${day(thisYear, true)}, ${time(thisYear)}`);
});

test("DATE-04 a time a little ahead of the device's clock is today; a missing or bad date gives nothing", () => {
    const ahead = new Date(NOW.getTime() + 2 * 60 * 1000);
    assert.equal(formatWhen(ahead.toISOString(), NOW), `today, ${time(ahead)}`);
    for (const bad of [null, undefined, "", "not a date"]) {
        assert.equal(formatWhen(bad, NOW), "");
        assert.equal(formatDay(bad, NOW), "");
        assert.equal(formatFullDay(bad), "");
        assert.equal(formatFullDayTime(bad), "");
    }
});
