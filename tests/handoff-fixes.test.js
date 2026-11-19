// Small fixes from the S4 handoff review: the findings PDF's file name (B-32) and
// the MongoDB URI in the API's start-up error (server/index.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { findingsFileName } from "../src/pages/Hazard/formatFindings.js";
import { hidePassword } from "../server/db/uri.js";

test("FIND-01 the PDF file name uses the officer's local date, not UTC (B-32)", () => {
    // 9:30 pm on 18 Nov in the test machine's own time zone: UTC may already be the 19th
    const evening = new Date(2026, 10, 18, 21, 30);
    assert.equal(findingsFileName(evening), "hazard-findings-2026-11-18.pdf");
    assert.equal(findingsFileName(new Date(2026, 0, 5, 0, 1)), "hazard-findings-2026-01-05.pdf");
});

test("URI-01 the start-up error hides a hosted database's password", () => {
    assert.equal(
        hidePassword("mongodb+srv://hiips:s3cr%40t@cluster0.example.mongodb.net/hiips360?retryWrites=true"),
        "mongodb+srv://hiips:***@cluster0.example.mongodb.net/hiips360?retryWrites=true",
    );
    assert.equal(hidePassword("mongodb://127.0.0.1:27017/hiips360"), "mongodb://127.0.0.1:27017/hiips360");
    assert.equal(hidePassword("mongodb://user@host/db"), "mongodb://user@host/db");
});
