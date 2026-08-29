// Unit tests for the SIP bootstrap logic. Run with: `npm test` (node --test).
// These test PURE functions only — no network, no native module, no React.
// Mocks (plain objects) are used ONLY here, never in the app runtime path.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapSipConfig,
  classifyBootstrapError,
  mapEngineStatus,
  isRegistrableConfig,
  isRetryable,
  sipBootstrapLabel,
  redactAccount,
} from "../sipBootstrap.ts";

test("mapSipConfig: maps a full backend response to a registrable UDP account", () => {
  const acc = mapSipConfig({
    transport: "UDP",
    server: "dialer.depthroute.com",
    domain: "dialer.depthroute.com",
    port: 5060,
    username: "dev7001",
    auth_username: "dev7001",
    password: "s3cr3t",
    outbound_proxy: "sip:proxy.depthroute.com",
    register_expires: 120,
    extension: { id: 1, extension: "7001", name: "Dev Line", device_type: "udp" },
  });
  assert.equal(acc.transport, "UDP");
  assert.equal(acc.username, "dev7001");
  assert.equal(acc.authUser, "dev7001");
  assert.equal(acc.password, "s3cr3t");
  assert.equal(acc.host, "dialer.depthroute.com");
  assert.equal(acc.port, 5060);
  assert.equal(acc.outboundProxy, "sip:proxy.depthroute.com");
  assert.equal(acc.registerExpires, 120);
  assert.equal(acc.displayName, "Dev Line");
  assert.equal(acc.enabled, true);
});

test("mapSipConfig: applies safe defaults (UDP, 5060, no proxy) when fields are absent", () => {
  const acc = mapSipConfig({ server: "h", username: "u", password: "p" });
  assert.equal(acc.transport, "UDP");
  assert.equal(acc.port, 5060);
  assert.equal(acc.outboundProxy, null);
  assert.equal(acc.host, "h");
});

test("isRegistrableConfig: requires username + password + host/domain (malformed config rejected)", () => {
  assert.equal(isRegistrableConfig({ username: "u", password: "p", host: "h" }), true);
  assert.equal(isRegistrableConfig({ username: "u", password: "p", domain: "d" }), true);
  assert.equal(isRegistrableConfig({ username: "u", password: "", host: "h" }), false);
  assert.equal(isRegistrableConfig({ username: "", password: "p", host: "h" }), false);
  assert.equal(isRegistrableConfig({ username: "u", password: "p" }), false);
  assert.equal(isRegistrableConfig(null), false);
});

test("classifyBootstrapError: NO_EXTENSION -> no_extension", () => {
  assert.equal(classifyBootstrapError({ code: "NO_EXTENSION", status: 404 }).state, "no_extension");
});
test("classifyBootstrapError: NEEDS_PROVISION -> needs_provision", () => {
  assert.equal(classifyBootstrapError({ code: "NEEDS_PROVISION" }).state, "needs_provision");
});
test("classifyBootstrapError: 401 / UNAUTHORIZED -> error", () => {
  assert.equal(classifyBootstrapError({ status: 401 }).state, "error");
  assert.equal(classifyBootstrapError({ code: "UNAUTHORIZED" }).state, "error");
});
test("classifyBootstrapError: network / timeout / 503 -> unavailable", () => {
  assert.equal(classifyBootstrapError({ status: 0, code: "NETWORK" }).state, "unavailable");
  assert.equal(classifyBootstrapError({ status: 0, code: "TIMEOUT" }).state, "unavailable");
  assert.equal(classifyBootstrapError({ status: 503 }).state, "unavailable");
});
test("classifyBootstrapError: unknown -> error, with a non-empty safe message", () => {
  const o = classifyBootstrapError(new Error("boom"));
  assert.equal(o.state, "error");
  assert.ok(o.message && o.message.length > 0);
});

test("mapEngineStatus: engine status -> bootstrap state", () => {
  assert.equal(mapEngineStatus("registered"), "registered");
  assert.equal(mapEngineStatus("connecting"), "registering");
  assert.equal(mapEngineStatus("unregistered"), "unregistered");
  assert.equal(mapEngineStatus("disconnected"), "unregistered");
  assert.equal(mapEngineStatus("registration_failed"), "registration_failed");
  assert.equal(mapEngineStatus("unsupported"), "unsupported");
  assert.equal(mapEngineStatus("error"), "error");
});

test("isRetryable: true for failure states, false for in-progress/success", () => {
  assert.equal(isRetryable("unavailable"), true);
  assert.equal(isRetryable("no_extension"), true);
  assert.equal(isRetryable("needs_provision"), true);
  assert.equal(isRetryable("registration_failed"), true);
  assert.equal(isRetryable("error"), true);
  assert.equal(isRetryable("registered"), false);
  assert.equal(isRetryable("registering"), false);
  assert.equal(isRetryable("loading"), false);
});

test("sipBootstrapLabel: every state has a non-empty label", () => {
  const states = [
    "idle", "loading", "registering", "registered", "unregistered",
    "registration_failed", "no_extension", "needs_provision", "unavailable",
    "unsupported", "error",
  ] as const;
  for (const s of states) {
    const label = sipBootstrapLabel(s);
    assert.ok(label && label.length > 0, `missing label for ${s}`);
  }
});

test("redactAccount: strips the SIP password so it is never logged", () => {
  const red = redactAccount({ username: "u", password: "s3cr3t", host: "h" });
  assert.equal(red.password, "***");
  assert.equal(red.username, "u");
  assert.equal(redactAccount({ password: "" }).password, "");
});
