/**
 * Timezone choices for sign-up.
 *
 * A curated list rather than the full IANA database: the picker is a one-time
 * account setting and the full set (~600 zones) is unusable on a phone. `id` is
 * the IANA name sent to the backend; `label` is the design's "(GMT-05:00) …" form.
 */
export type Timezone = { id: string; label: string };

export const TIMEZONES: Timezone[] = [
  { id: "Pacific/Midway", label: "(GMT-11:00) Midway Island, Samoa" },
  { id: "Pacific/Honolulu", label: "(GMT-10:00) Hawaii" },
  { id: "America/Anchorage", label: "(GMT-09:00) Alaska" },
  { id: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time (US & Canada)" },
  { id: "America/Phoenix", label: "(GMT-07:00) Arizona" },
  { id: "America/Denver", label: "(GMT-07:00) Mountain Time (US & Canada)" },
  { id: "America/Chicago", label: "(GMT-06:00) Central Time (US & Canada)" },
  { id: "America/Mexico_City", label: "(GMT-06:00) Mexico City" },
  { id: "America/New_York", label: "(GMT-05:00) Eastern Time (US & Canada)" },
  { id: "America/Bogota", label: "(GMT-05:00) Bogota, Lima" },
  { id: "America/Halifax", label: "(GMT-04:00) Atlantic Time (Canada)" },
  { id: "America/Sao_Paulo", label: "(GMT-03:00) Brasilia" },
  { id: "America/Argentina/Buenos_Aires", label: "(GMT-03:00) Buenos Aires" },
  { id: "Atlantic/Azores", label: "(GMT-01:00) Azores" },
  { id: "UTC", label: "(GMT+00:00) UTC" },
  { id: "Europe/London", label: "(GMT+00:00) London, Dublin, Lisbon" },
  { id: "Europe/Paris", label: "(GMT+01:00) Paris, Amsterdam, Madrid" },
  { id: "Europe/Berlin", label: "(GMT+01:00) Berlin, Rome, Stockholm" },
  { id: "Africa/Lagos", label: "(GMT+01:00) West Central Africa" },
  { id: "Europe/Athens", label: "(GMT+02:00) Athens, Helsinki, Kyiv" },
  { id: "Africa/Johannesburg", label: "(GMT+02:00) Harare, Pretoria" },
  { id: "Europe/Moscow", label: "(GMT+03:00) Moscow, St. Petersburg" },
  { id: "Asia/Riyadh", label: "(GMT+03:00) Kuwait, Riyadh" },
  { id: "Asia/Dubai", label: "(GMT+04:00) Abu Dhabi, Muscat" },
  { id: "Asia/Karachi", label: "(GMT+05:00) Islamabad, Karachi" },
  { id: "Asia/Kolkata", label: "(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi" },
  { id: "Asia/Dhaka", label: "(GMT+06:00) Astana, Dhaka" },
  { id: "Asia/Bangkok", label: "(GMT+07:00) Bangkok, Hanoi, Jakarta" },
  { id: "Asia/Shanghai", label: "(GMT+08:00) Beijing, Hong Kong, Singapore" },
  { id: "Asia/Tokyo", label: "(GMT+09:00) Osaka, Sapporo, Tokyo" },
  { id: "Asia/Seoul", label: "(GMT+09:00) Seoul" },
  { id: "Australia/Sydney", label: "(GMT+10:00) Canberra, Melbourne, Sydney" },
  { id: "Pacific/Auckland", label: "(GMT+12:00) Auckland, Wellington" },
];

/** The design's default, and the fallback when the device zone is unknown. */
export const DEFAULT_TIMEZONE_ID = "America/New_York";

/** The device's IANA zone if it is one we offer, else the design's default. */
export function deviceTimezone(): Timezone {
  let id = DEFAULT_TIMEZONE_ID;
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved && TIMEZONES.some((t) => t.id === resolved)) id = resolved;
  } catch {
    // Intl is unavailable on some old Android JSC builds — keep the default.
  }
  return TIMEZONES.find((t) => t.id === id) ?? TIMEZONES[0];
}
