// LocalMoh — replaces the outbound audio track on an active RTCPeerConnection
// with the audio of a user-provided file (WAV / MP3 / OGG).
//
// This is only implemented for the browser / web preview because it relies on
// Web Audio API (AudioContext + MediaStreamDestination) which does NOT exist
// in react-native-webrtc. On native builds we fall back to standard SIP hold
// (server MOH) and return `{ ok: false, reason: "unsupported" }`.
import { Platform } from "react-native";

type Handle = {
  audioCtx: AudioContext;
  source: AudioBufferSourceNode;
  destination: MediaStreamAudioDestinationNode;
  originalTrack: MediaStreamTrack | null;
  sender: RTCRtpSender;
};

export function isLocalMohSupported(): boolean {
  return Platform.OS === "web" &&
    typeof (globalThis as any).AudioContext !== "undefined" &&
    typeof (globalThis as any).MediaStreamAudioDestinationNode !== "undefined";
}

async function fetchAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return res.arrayBuffer();
}

/** Swap the outbound audio track for a looping local file. */
export async function startLocalMoh(
  pc: RTCPeerConnection,
  fileUri: string,
  opts: { loop?: boolean; volume?: number } = {},
): Promise<{ ok: boolean; reason?: string; handle?: Handle }> {
  if (!isLocalMohSupported()) {
    return { ok: false, reason: "unsupported" };
  }
  const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
  if (!sender) return { ok: false, reason: "no-audio-sender" };

  try {
    const AudioCtor =
      (globalThis as any).AudioContext ||
      (globalThis as any).webkitAudioContext;
    const audioCtx: AudioContext = new AudioCtor();
    const buffer = await fetchAsArrayBuffer(fileUri);
    const decoded = await audioCtx.decodeAudioData(buffer.slice(0));

    const src = audioCtx.createBufferSource();
    src.buffer = decoded;
    src.loop = opts.loop !== false;

    const gain = audioCtx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, opts.volume ?? 1));

    const dest = audioCtx.createMediaStreamDestination();
    src.connect(gain).connect(dest);
    src.start(0);

    const newTrack = dest.stream.getAudioTracks()[0];
    if (!newTrack) return { ok: false, reason: "no-track-produced" };

    const originalTrack = sender.track || null;
    await sender.replaceTrack(newTrack);

    const handle: Handle = {
      audioCtx,
      source: src,
      destination: dest,
      originalTrack,
      sender,
    };
    return { ok: true, handle };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "decode-failed" };
  }
}

/** Restore the original mic track and tear down the Web Audio graph. */
export async function stopLocalMoh(handle: Handle | null | undefined): Promise<void> {
  if (!handle) return;
  try { handle.source.stop(); } catch {}
  try { handle.source.disconnect(); } catch {}
  try { handle.destination.disconnect(); } catch {}
  try { await handle.audioCtx.close(); } catch {}
  try { await handle.sender.replaceTrack(handle.originalTrack); } catch {}
}

/** Quick preview of a MOH file through the device speakers (web only). */
export async function previewMoh(fileUri: string): Promise<{ stop: () => void } | null> {
  if (Platform.OS !== "web" || typeof (globalThis as any).Audio === "undefined") return null;
  try {
    const audio = new (globalThis as any).Audio(fileUri) as HTMLAudioElement;
    audio.loop = false;
    await audio.play();
    return { stop: () => { try { audio.pause(); audio.src = ""; } catch {} } };
  } catch {
    return null;
  }
}

export type LocalMohHandle = Handle;
