import assert from "node:assert/strict";
import { test } from "node:test";
import { selectTransport, transportLabel } from "../transportSelect.ts";
import type { TransportAvailability } from "../CallEngine.ts";

const UDP_OK: TransportAvailability = { transport: "UDP", available: true };
const UDP_NO: TransportAvailability = { transport: "UDP", available: false, reason: "NO_NATIVE_MODULE" };
const WEB_OK: TransportAvailability = { transport: "WEBRTC", available: true };
const WEB_NO: TransportAvailability = { transport: "WEBRTC", available: false, reason: "NO_WEBRTC_STACK" };

test("AUTO prefers UDP when UDP is genuinely available", () => {
  assert.equal(selectTransport("AUTO", UDP_OK, WEB_OK).selected, "UDP");
});

test("AUTO falls back to WebRTC only when UDP is unavailable", () => {
  const d = selectTransport("AUTO", UDP_NO, WEB_OK);
  assert.equal(d.selected, "WEBRTC");
});

test("AUTO yields no transport when neither is available", () => {
  const d = selectTransport("AUTO", UDP_NO, WEB_NO);
  assert.equal(d.selected, null);
  assert.equal(d.label, "Calling unavailable");
});

test("explicit UDP never silently switches to WebRTC", () => {
  const d = selectTransport("UDP", UDP_NO, WEB_OK);
  assert.equal(d.selected, null);
  assert.equal(d.reason, "NO_NATIVE_MODULE");
});

test("explicit WEBRTC never silently switches to UDP", () => {
  const d = selectTransport("WEBRTC", UDP_OK, WEB_NO);
  assert.equal(d.selected, null);
  assert.equal(d.reason, "NO_WEBRTC_STACK");
});

test("diagnostics label names the active transport", () => {
  assert.equal(transportLabel("UDP"), "Calling transport: SIP/UDP");
  assert.equal(transportLabel("WEBRTC"), "Calling transport: WebRTC");
  assert.equal(transportLabel(null), "Calling unavailable");
});
