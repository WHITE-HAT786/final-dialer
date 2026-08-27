// expo-pjsip — a native SIP/UDP engine (PJSIP / pjsua2) exposed to JS.
//
// Requires a Development Build (expo prebuild); it is NOT available in Expo Go.
// getPjsip() returns null when the native module isn't linked (e.g. Expo Go), so
// the app can degrade to an "unsupported" state instead of crashing at import.

import { NativeModule, requireNativeModule } from "expo-modules-core";
import { PjsipConfig, PjsipEvents, PjsipRegState } from "./src/ExpoPjsip.types";

export * from "./src/ExpoPjsip.types";

export declare class ExpoPjsipNative extends NativeModule<PjsipEvents> {
  /** Create the PJSIP endpoint + a UDP transport + the account (does not register yet). */
  initialize(config: PjsipConfig): Promise<void>;
  register(): Promise<void>;
  unregister(): Promise<void>;
  /** INVITE to `number` (dialed on the registered account). Resolves to a callId. */
  makeCall(number: string): Promise<string>;
  answerCall(callId: string): Promise<void>;
  rejectCall(callId: string): Promise<void>;
  hangup(callId: string): Promise<void>;
  sendDtmf(callId: string, digit: string): Promise<void>;
  setMute(callId: string, muted: boolean): Promise<void>;
  setSpeaker(enabled: boolean): Promise<void>;
  getRegistrationState(): PjsipRegState;
  /** Tear down the account, transport and endpoint. */
  destroy(): Promise<void>;
}

let _native: ExpoPjsipNative | null = null;
let _tried = false;

/** The native module, or null when it isn't linked (Expo Go / web). Never throws. */
export function getPjsip(): ExpoPjsipNative | null {
  if (!_tried) {
    _tried = true;
    try {
      _native = requireNativeModule<ExpoPjsipNative>("ExpoPjsip");
    } catch {
      _native = null;
    }
  }
  return _native;
}

export function isPjsipAvailable(): boolean {
  return getPjsip() !== null;
}
