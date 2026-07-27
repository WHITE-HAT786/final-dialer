import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { storage } from "@/src/utils/storage";
import { colors } from "@/src/theme";

export type SipAccount = {
  id: string;
  name: string;
  did: string; // caller ID number
  host: string;
  color: string;
  provider: string;
};

export const SIP_ACCOUNTS: SipAccount[] = [
  { id: "telnyx_us", name: "Telnyx US Trunk", did: "+1 202-555-0143", host: "sip.telnyx.com", color: colors.green, provider: "Telnyx" },
  { id: "twilio_1", name: "Twilio Trunk", did: "+1 305-555-0148", host: "sip.twilio.com", color: colors.red, provider: "Twilio" },
  { id: "bandwidth", name: "Bandwidth Trunk", did: "+1 800-555-0199", host: "sip.bandwidth.com", color: colors.primary, provider: "Bandwidth" },
  { id: "vonage", name: "Vonage Trunk", did: "+1 312-555-0177", host: "sip.vonage.com", color: colors.purple, provider: "Vonage" },
  { id: "plivo", name: "Plivo Trunk", did: "+1 469-555-0112", host: "sip.plivo.com", color: colors.yellow, provider: "Plivo" },
];

const KEY = "selected_sip_id";

type Ctx = {
  selected: SipAccount;
  setSelected: (id: string) => Promise<void>;
  accounts: SipAccount[];
};

const SipContext = createContext<Ctx | null>(null);

export function SipProvider({ children }: { children: ReactNode }) {
  const [selected, setSelectedState] = useState<SipAccount>(SIP_ACCOUNTS[0]);

  useEffect(() => {
    (async () => {
      const id = await storage.getItem<string>(KEY, "");
      if (id) {
        const found = SIP_ACCOUNTS.find((a) => a.id === id);
        if (found) setSelectedState(found);
      }
    })();
  }, []);

  const setSelected = async (id: string) => {
    const found = SIP_ACCOUNTS.find((a) => a.id === id);
    if (!found) return;
    setSelectedState(found);
    await storage.setItem(KEY, id);
  };

  return (
    <SipContext.Provider value={{ selected, setSelected, accounts: SIP_ACCOUNTS }}>
      {children}
    </SipContext.Provider>
  );
}

export function useSip() {
  const ctx = useContext(SipContext);
  if (!ctx) throw new Error("useSip must be used inside SipProvider");
  return ctx;
}
