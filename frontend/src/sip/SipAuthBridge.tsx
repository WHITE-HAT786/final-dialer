// Bridges authentication to the SIP layer. Rendered once, inside both the
// AuthProvider and the MultiSipProvider. It owns exactly one rule:
//
//   authenticated  -> bootstrap the customer's OWN line from /sip-config.php
//                     and register over SIP/UDP
//   not authenticated (logout / token expiry / switch) -> unregister + clear
//
// SIP bootstrap therefore happens ONLY when a user is present. Fresh login, 2FA
// completion, and session restore all funnel through AuthContext.user, so a
// single effect keyed on the user id covers all three. Renders nothing.

import { useEffect, useRef } from "react";
import { useAuth } from "@/src/AuthContext";
import { useMultiSip } from "./MultiSipContext";

export default function SipAuthBridge() {
  const { user } = useAuth();
  const { bootstrapPrimary, teardownPrimary } = useMultiSip();

  // Keep the latest fns in refs so the effect can depend ONLY on the user id
  // (it must not re-run just because the context re-rendered new callbacks).
  const bootRef = useRef(bootstrapPrimary);
  const downRef = useRef(teardownPrimary);
  bootRef.current = bootstrapPrimary;
  downRef.current = teardownPrimary;

  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.user_id ?? null;
    if (uid === lastUid.current) return; // no auth transition
    const prev = lastUid.current;
    lastUid.current = uid;

    let cancelled = false;
    (async () => {
      if (!uid) {
        await downRef.current(); // logged out / token expired
        return;
      }
      if (prev && prev !== uid) await downRef.current(); // account switch
      if (!cancelled) await bootRef.current();
    })();
    return () => { cancelled = true; };
  }, [user?.user_id]);

  return null;
}
