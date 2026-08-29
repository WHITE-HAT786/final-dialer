// Phase 24 — regression tests for the SIP registration-lifecycle bug where the
// app registered then destroyed the native account (account=null) while the UI
// still showed "Registered", so makeCall() threw "Not registered".
//
// These cover the pure lifecycle DECISIONS (native reg state is authoritative).
// The decisions drive NativeSipEngine.connect() (idempotency), ensureRegistered()
// (self-heal before a call) and reconcile() (foreground/network recovery).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isNativeUp, canPlaceCall, needsReinit } from "../sipLifecycle.ts";

// (1)+(2) connect() idempotent: an already up line must NOT be rebuilt (a rebuild
// is what caused REGISTER -> unregister -> account=null churn).
test("idempotent connect: a registered/registering line needs no re-init", () => {
  assert.equal(needsReinit("registered"), false);
  assert.equal(needsReinit("registering"), false);
  assert.equal(needsReinit("initializing"), false);
  assert.equal(isNativeUp("registered"), true);
});

// (3) transient registration loss / (9) network recovery: a dead account must be
// rebuilt on the next connect/reconcile.
test("recovery: a torn-down/offline account must be re-initialized", () => {
  for (const s of ["offline", "unregistered", "failed", "unregistering"]) {
    assert.equal(needsReinit(s), true, `${s} should trigger re-init`);
    assert.equal(isNativeUp(s), false, `${s} is not up`);
  }
});

// (5) makeCall cannot operate on a stale "Registered": a call is allowed ONLY when
// the native account is genuinely registered (not merely "registering"/offline).
test("call gate: only a genuinely registered native account can place a call", () => {
  assert.equal(canPlaceCall("registered"), true);
  for (const s of ["registering", "initializing", "unregistered", "unregistering", "failed", "offline"]) {
    assert.equal(canPlaceCall(s), false, `${s} must not place a call`);
  }
});

// (4) UI registration follows the native event, never a cached flag: an unknown /
// offline native state is never treated as up or callable.
test("authoritative state: unknown/offline is neither up nor callable", () => {
  assert.equal(isNativeUp("offline"), false);
  assert.equal(canPlaceCall("offline"), false);
  assert.equal(isNativeUp("something-unexpected"), false);
  assert.equal(canPlaceCall("something-unexpected"), false);
});
