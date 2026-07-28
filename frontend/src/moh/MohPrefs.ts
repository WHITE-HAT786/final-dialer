// Music On Hold preferences — persisted in AsyncStorage so they survive relaunches.
// Currently supports two sources:
//   - "server"  → standard SIP hold, Asterisk streams its own MOH class.
//   - "local"   → keep call active but swap the outgoing mic track with a local
//                 audio file (WAV/MP3) chosen by the user. WEB PREVIEW ONLY.
//                 On native (react-native-webrtc) this falls back to server MOH
//                 with an informational log.
import { storage } from "@/src/utils/storage";

export type MohSource = "server" | "local";

export type MohPrefs = {
  source: MohSource;
  fileUri: string;       // data URI (web) or file:// path (native)
  fileName: string;
  fileSize: number;      // bytes
  loop: boolean;
  volume: number;        // 0..1
};

const KEY = "moh_prefs_v1";

export const DEFAULT_MOH: MohPrefs = {
  source: "server",
  fileUri: "",
  fileName: "",
  fileSize: 0,
  loop: true,
  volume: 1,
};

export async function loadMohPrefs(): Promise<MohPrefs> {
  const saved = (await storage.getItem<Partial<MohPrefs>>(KEY, {})) || {};
  return { ...DEFAULT_MOH, ...saved };
}

export async function saveMohPrefs(patch: Partial<MohPrefs>): Promise<MohPrefs> {
  const current = await loadMohPrefs();
  const next = { ...current, ...patch };
  await storage.setItem(KEY, next);
  return next;
}

export async function resetMohPrefs(): Promise<void> {
  await storage.removeItem(KEY);
}
