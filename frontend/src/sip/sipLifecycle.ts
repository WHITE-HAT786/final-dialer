// Pure SIP-lifecycle decisions — unit-testable without the native module.
//
// The native PJSIP registration state (from ExpoPjsipModule.getRegistrationState())
// is the AUTHORITATIVE source of truth. The JS-side status can go stale (the
// native stack can be torn down out-of-band by Expo OnDestroy on background or by
// network loss), so every "can we X?" decision must be made from the native state,
// never from a cached "registered" flag.

export type NativeRegState =
  | "registered"
  | "registering"
  | "initializing"
  | "unregistered"
  | "unregistering"
  | "failed"
  | "offline"
  | string;

/** The native line is up (registered, or actively (re)registering). */
export function isNativeUp(s: NativeRegState): boolean {
  return s === "registered" || s === "registering" || s === "initializing";
}

/** A call may be placed ONLY on a genuinely registered native account. */
export function canPlaceCall(s: NativeRegState): boolean {
  return s === "registered";
}

/**
 * connect()/ensureRegistered must (re)build + register the native stack unless
 * it is already up. A dead/offline/failed/unregistered account needs a rebuild.
 */
export function needsReinit(s: NativeRegState): boolean {
  return !isNativeUp(s);
}
