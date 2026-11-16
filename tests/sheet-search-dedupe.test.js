// TEST-SEARCH: duplicate results on the sheet search page (B-18). Uses the real sheet JSON; no model needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dedupeResults } from "../src/search/dedupeResults.js";

const dir = new URL("../src/data/sheets/", import.meta.url);
const CHUNKS = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")).chunks);
const chunk = (id) => CHUNKS.find((c) => c.id === id);

test("SEARCH-01 across every sheet, each sheet is listed once, at its best match", () => {
    const ranked = ["cu-732044-027", "cu-761030-017", "cu-732044-045", "cu-732044-004", "cu-763025-015"].map(chunk);
    const ids = dedupeResults(ranked, { onePerSheet: true }).map((c) => c.id);
    assert.deepEqual(ids, ["cu-732044-027", "cu-761030-017", "cu-763025-015"]);
});

test("SEARCH-02 within one sheet, a passage repeated word for word is listed once", () => {
    // The same suspended-logs hazard sits under Loading (p. 9) and Unloading (p. 16)
    assert.equal(chunk("cu-732044-027").text, chunk("cu-732044-045").text);
    const ranked = ["cu-732044-045", "cu-732044-004", "cu-732044-027", "cu-732044-066", "cu-732044-067"].map(chunk);
    const ids = dedupeResults(ranked).map((c) => c.id);
    assert.deepEqual(ids, ["cu-732044-045", "cu-732044-004", "cu-732044-066"]);
});

test("SEARCH-03 the same text in two different sheets is not a duplicate", () => {
    const ranked = [chunk("cu-761030-017"), chunk("cu-763025-015")];
    assert.equal(dedupeResults(ranked).length, 2);
});
