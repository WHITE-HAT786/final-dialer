// Phase 22 Part N — data formatting + honest empty/unknown states. Pure logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtDuration, fmtMoney, fmtDate, fmtTime, fmtDateTime, relTime, initials } from "../../utils/format.ts";

test("fmtDuration: seconds -> m:ss / h:mm:ss; unknown -> em dash (never a fake 0:00)", () => {
  assert.equal(fmtDuration(0), "0:00");
  assert.equal(fmtDuration(5), "0:05");
  assert.equal(fmtDuration(65), "1:05");
  assert.equal(fmtDuration(3661), "1:01:01");
  assert.equal(fmtDuration(null), "—");
  assert.equal(fmtDuration(undefined), "—");
  assert.equal(fmtDuration(-1), "—");
});

test("fmtMoney: real 0 -> $0.00; USD; other currency; unknown -> em dash (never fake)", () => {
  assert.equal(fmtMoney("0.000000"), "$0.00");   // a REAL zero renders $0.00
  assert.equal(fmtMoney(12.3), "$12.30");
  assert.equal(fmtMoney("5", "EUR"), "5.00 EUR");
  assert.equal(fmtMoney(null), "—");             // unknown -> em dash, never $0.00
  assert.equal(fmtMoney(undefined), "—");
  assert.equal(fmtMoney("abc"), "—");
});

test("fmtDate/fmtTime/fmtDateTime: parse backend datetime; fall back to raw, never fabricate", () => {
  assert.equal(fmtDate("2026-08-29 15:07:00").includes("2026"), true);
  assert.equal(fmtDate(null), "—");
  assert.equal(fmtDate("not-a-date"), "not-a-date");
  assert.match(fmtTime("2026-08-29 15:07:00"), /\d{1,2}:\d{2} (AM|PM)/);
  assert.equal(fmtDateTime(null), "—");
  assert.equal(fmtDateTime("2026-08-29 15:07:00").includes("·"), true);
});

test("relTime: recent -> Just now; empty -> empty string (no fabricated time)", () => {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  assert.equal(relTime(now), "Just now");
  assert.equal(relTime(null), "");
  assert.equal(relTime(undefined), "");
});

test("initials: first two word initials, uppercased; empty -> em dash", () => {
  assert.equal(initials("shannon garner"), "SG");
  assert.equal(initials("benjamin"), "B");
  assert.equal(initials("  a  b  c "), "AB");
  assert.equal(initials(""), "—");
  assert.equal(initials(null), "—");
});
