// src/data/sheets/catalog.js: the sheet list entries and the home page word search.
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesWords, splitTitle, toCatalogEntry } from "../src/data/sheets/catalog.js";
import motionPicture from "../src/data/sheets/cu-763025-motion-picture.json" with { type: "json" };

const sheet = {
    sheetId: "cu-732044",
    title: "Log Transport (CU 732044)",
    issued: "2020/05/28",
    chunks: [
        { section: "Hazards", text: "Not the intro." },
        { section: "Industry or Classification Unit Information", text: "Hauling  logs\nby logging truck." },
    ],
};

test("CAT-01 splits the CU number out of the title", () => {
    assert.deepEqual(splitTitle("Log Transport (CU 732044)"), { name: "Log Transport", cu: "CU 732044" });
    assert.deepEqual(splitTitle("No number here"), { name: "No number here", cu: "" });
});

test("B-29 Home finds Motion Picture by its everyday names as well as catalogue words", () => {
    const motion = toCatalogEntry(motionPicture);
    for (const query of ["film", "MOVIE", "film 763025"]) {
        assert.ok(matchesWords(motion, query), query);
        assert.ok(!matchesWords(toCatalogEntry(sheet), query), query);
    }
    assert.ok(!matchesWords(motion, "movie nursing"));
});

test("CAT-02 catalogue entry: summary is the information section, dates use dashes", () => {
    const entry = toCatalogEntry(sheet);
    assert.equal(entry.summary, "Hauling logs by logging truck.");
    assert.equal(entry.issued, "2020-05-28");
    assert.equal(entry.name, "Log Transport");
});

test("CAT-03 word search: every word must appear in the name, CU number or summary, any case", () => {
    const entry = toCatalogEntry(sheet);
    for (const q of ["log", "LOG TRUCK", "732044", "hauling transport", "  "]) assert.ok(matchesWords(entry, q), q);
    for (const q of ["care", "log care"]) assert.ok(!matchesWords(entry, q), q);
});
