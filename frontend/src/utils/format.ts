// Small, dependency-free formatters shared by every screen. No Intl reliance
// (Hermes coverage varies), so output is deterministic on device. Every function
// degrades to an em dash / raw value rather than inventing data.

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Parse a backend "YYYY-MM-DD HH:MM:SS" (or ISO) string; null if unparseable. */
function parseDT(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

/** "Aug 29, 2026" (falls back to the raw string, never a fabricated date). */
export function fmtDate(s?: string | null): string {
  const d = parseDT(s);
  if (!d) return s ? String(s) : "—";
  return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "3:07 PM" */
export function fmtTime(s?: string | null): string {
  const d = parseDT(s);
  if (!d) return s ? String(s) : "—";
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad2(d.getMinutes())} ${ap}`;
}

/** "Aug 29, 2026 · 3:07 PM" */
export function fmtDateTime(s?: string | null): string {
  const d = parseDT(s);
  if (!d) return s ? String(s) : "—";
  return `${fmtDate(s)} · ${fmtTime(s)}`;
}

/** "Just now" / "5m ago" / "3h ago" / "2d ago" / date for older. */
export function relTime(s?: string | null): string {
  const d = parseDT(s);
  if (!d) return s ? String(s) : "";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d ago`;
  return fmtDate(s);
}

/** Seconds -> "m:ss" or "h:mm:ss". "—" when unknown (never a fake 0:00). */
export function fmtDuration(sec?: number | null): string {
  if (sec == null || isNaN(sec) || sec < 0) return "—";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** Money. USD renders "$12.34"; other currencies "12.34 EUR". "—" when unknown. */
export function fmtMoney(v?: string | number | null, currency = "USD"): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (n == null || isNaN(n as number)) return "—";
  const amt = (n as number).toLocaleString ? (n as number) : Number(n);
  const fixed = amt.toFixed(2);
  return currency === "USD" ? `$${fixed}` : `${fixed} ${currency}`;
}

/** Initials for an avatar, e.g. "shannon garner" -> "SG". */
export function initials(name?: string | null): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
