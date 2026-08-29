// Phase 22 Part N — automatic SIP config, extension-number identity (19H), UDP
// transport, and register/unregister state. Pure logic, no device required.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapSipConfig, isRegistrableConfig, mapEngineStatus, redactAccount } from "../sipBootstrap.ts";

test("mapSipConfig: extension-NUMBER identity + UDP defaults (matches the 19H backend fix)", () => {
  const acc = mapSipConfig({
    transport: "UDP",
    server: "dialer.depthroute.com",
    domain: "dialer.depthroute.com",
    port: 5060,
    username: "1011",        // 19H: sip-config returns the extension NUMBER, not the endpoint name
    auth_username: "1011",
    password: "device-credential",
    extension: { id: 121, extension: "1011", name: "1011", device_type: "both" },
  });
  assert.equal(acc.username, "1011");
  assert.equal(acc.authUser, "1011");
  assert.equal(acc.host, "dialer.depthroute.com");
  assert.equal(acc.transport, "UDP");
  assert.equal(acc.port, 5060);
  assert.equal(acc.enabled, true);
  // displayName should prefer the human extension name, not the raw username
  assert.equal(acc.displayName, "1011");
});

test("mapSipConfig: safe UDP/5060 defaults when optional fields are absent", () => {
  const acc = mapSipConfig({ username: "2001", password: "p", server: "sip.example.com" });
  assert.equal(acc.transport, "UDP");
  assert.equal(acc.port, 5060);
  assert.equal(acc.host, "sip.example.com");
  assert.equal(acc.username, "2001");
});

test("isRegistrableConfig: requires username + password + host/domain (UDP identity)", () => {
  assert.equal(isRegistrableConfig({ username: "1011", password: "p", host: "dialer.depthroute.com" }), true);
  assert.equal(isRegistrableConfig({ username: "1011", password: "p", domain: "dialer.depthroute.com" }), true);
  assert.equal(isRegistrableConfig({ username: "1011", password: "", host: "x" }), false);
  assert.equal(isRegistrableConfig({ username: "", password: "p", host: "x" }), false);
  assert.equal(isRegistrableConfig({ username: "1011", password: "p" }), false);
  assert.equal(isRegistrableConfig(null), false);
});

test("mapEngineStatus: only a native 'registered' event yields 'registered' (no fake Registered)", () => {
  assert.equal(mapEngineStatus("registered"), "registered");
  assert.equal(mapEngineStatus("connecting"), "registering");
  assert.equal(mapEngineStatus("registration_failed"), "registration_failed");
  assert.equal(mapEngineStatus("unregistered"), "unregistered");
  assert.equal(mapEngineStatus("disconnected"), "unregistered");
});

test("redactAccount: the SIP password is never leaked", () => {
  const r = redactAccount({ username: "1011", password: "topsecret" });
  assert.equal(r.password, "***");
  assert.notEqual(r.password, "topsecret");
  const empty = redactAccount({ username: "1011", password: "" });
  assert.equal(empty.password, "");
});
