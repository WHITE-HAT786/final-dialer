// Depth Route Dialer — design tokens (v2)
//
// Mirrors the token rows in "DepthRoute App v2.dc.html": one shared scale for
// both palettes, so every screen reads colours from the active palette instead
// of hard-coding a dark value.
//
// Usage inside a component:
//   const c = useTheme();                          // active palette
//   const styles = useThemedStyles(makeStyles);    // makeStyles = (c: Palette) => StyleSheet.create({...})
//
// `colors` stays exported as the dark palette for module-scope constants that
// are not part of a component (and as a fallback outside the provider).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, StyleSheet, type ViewStyle } from "react-native";

import { storage } from "@/src/utils/storage";

export type ThemeMode = "dark" | "light";

export type Palette = {
  mode: ThemeMode;

  // Surfaces
  bg: string;
  bgElev: string;
  card: string;
  cardAlt: string;
  input: string;

  // Lines
  border: string;
  borderSoft: string;
  borderStrong: string;

  // Type
  text: string;
  muted: string;
  dim: string;
  onPrimary: string;

  // Accents — every accent has a `Soft` fill and a `Border` hairline so the
  // pill / tile / banner treatments stay identical across the palettes.
  primary: string;
  primarySoft: string;
  primaryBorder: string;
  ring: string;

  success: string;
  successSoft: string;
  successBorder: string;

  warn: string;
  warnSoft: string;
  warnBorder: string;

  danger: string;
  dangerSoft: string;
  dangerBorder: string;

  purple: string;
  purpleSoft: string;
  purpleBorder: string;

  teal: string;
  tealSoft: string;
  tealBorder: string;

  orange: string;
  orangeSoft: string;
  pink: string;

  // Scrims
  overlay: string;
  drawerScrim: string;

  // Legacy aliases (solid hex — safe for the `colors.x + "40"` alpha suffix
  // pattern used in a few older styles; the rgba `*Soft` tokens are not).
  bgAlt: string;
  textMuted: string;
  textDim: string;
  green: string;
  greenDim: string;
  red: string;
  redDim: string;
  yellow: string;
  yellowDim: string;
  purpleDim: string;
  tealDim: string;
  orangeDim: string;
  primaryDim: string;
};

const dark: Palette = {
  mode: "dark",

  bg: "#050B1A",
  bgElev: "#0A1224",
  card: "#0F1A30",
  cardAlt: "#111C33",
  input: "#0A1224",

  border: "#1E2A45",
  borderSoft: "#172136",
  borderStrong: "#2A3A5C",

  text: "#FFFFFF",
  muted: "#8891A6",
  dim: "#737E96",
  onPrimary: "#FFFFFF",

  primary: "#2F80ED",
  primarySoft: "rgba(47,128,237,0.14)",
  primaryBorder: "rgba(47,128,237,0.32)",
  ring: "rgba(47,128,237,0.32)",

  success: "#22C55E",
  successSoft: "rgba(34,197,94,0.14)",
  successBorder: "rgba(34,197,94,0.32)",

  warn: "#F59E0B",
  warnSoft: "rgba(245,158,11,0.14)",
  warnBorder: "rgba(245,158,11,0.32)",

  danger: "#EF4444",
  dangerSoft: "rgba(239,68,68,0.14)",
  dangerBorder: "rgba(239,68,68,0.32)",

  purple: "#A855F7",
  purpleSoft: "rgba(168,85,247,0.14)",
  purpleBorder: "rgba(168,85,247,0.32)",

  teal: "#14B8A6",
  tealSoft: "rgba(20,184,166,0.14)",
  tealBorder: "rgba(20,184,166,0.32)",

  orange: "#F97316",
  orangeSoft: "rgba(249,115,22,0.14)",
  pink: "#EC4899",

  overlay: "rgba(2,6,15,0.72)",
  drawerScrim: "rgba(2,6,15,0.62)",

  bgAlt: "#0A1224",
  textMuted: "#8891A6",
  textDim: "#737E96",
  green: "#22C55E",
  greenDim: "#0F3B22",
  red: "#EF4444",
  redDim: "#3B1518",
  yellow: "#F59E0B",
  yellowDim: "#3B2810",
  purpleDim: "#2A163F",
  tealDim: "#0B3A36",
  orangeDim: "#3A1E10",
  primaryDim: "#1F3A6B",
};

const light: Palette = {
  mode: "light",

  bg: "#F5F7FB",
  bgElev: "#FFFFFF",
  card: "#FFFFFF",
  cardAlt: "#F7F9FC",
  input: "#FFFFFF",

  border: "#E2E7F0",
  borderSoft: "#EDF1F7",
  borderStrong: "#C7D0DE",

  text: "#0B1424",
  muted: "#5A6478",
  dim: "#6E778A",
  onPrimary: "#FFFFFF",

  primary: "#2F80ED",
  primarySoft: "rgba(47,128,237,0.09)",
  primaryBorder: "rgba(47,128,237,0.24)",
  ring: "rgba(47,128,237,0.18)",

  success: "#15803D",
  successSoft: "rgba(21,128,61,0.08)",
  successBorder: "rgba(21,128,61,0.24)",

  warn: "#B45309",
  warnSoft: "rgba(180,83,9,0.08)",
  warnBorder: "rgba(180,83,9,0.24)",

  danger: "#DC2626",
  dangerSoft: "rgba(220,38,38,0.07)",
  dangerBorder: "rgba(220,38,38,0.24)",

  purple: "#7E22CE",
  purpleSoft: "rgba(126,34,206,0.08)",
  purpleBorder: "rgba(126,34,206,0.24)",

  teal: "#0F766E",
  tealSoft: "rgba(15,118,110,0.08)",
  tealBorder: "rgba(15,118,110,0.24)",

  orange: "#C2410C",
  orangeSoft: "rgba(194,65,12,0.08)",
  pink: "#BE185D",

  overlay: "rgba(11,20,36,0.45)",
  drawerScrim: "rgba(11,20,36,0.38)",

  bgAlt: "#FFFFFF",
  textMuted: "#5A6478",
  textDim: "#6E778A",
  green: "#15803D",
  greenDim: "#ECF5F0",
  red: "#DC2626",
  redDim: "#FCF0F0",
  yellow: "#B45309",
  yellowDim: "#F9F1EB",
  purpleDim: "#F5EDFB",
  tealDim: "#ECF4F3",
  orangeDim: "#FAF0EA",
  primaryDim: "#ECF4FD",
};

export const palettes: Record<ThemeMode, Palette> = { dark, light };

/** Dark palette. Prefer `useTheme()` inside components. */
export const colors = dark;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32 };

/** v2 uses a 12px card radius, 10px control radius and 999 pills. */
export const radius = { xs: 6, sm: 9, md: 10, lg: 12, xl: 16, pill: 999 };

/** Standard control height from the design (search rows, add buttons, pickers). */
export const CONTROL_H = 46;

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 21, fontWeight: "700" as const },
  h3: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 14.5 },
  small: { fontSize: 12.5 },
  tiny: { fontSize: 11 },
};

/** The one card elevation. Flat in dark, a 1px lift in light. */
export function cardShadow(c: Palette): ViewStyle {
  if (c.mode === "dark") return {};
  return {
    shadowColor: "#101828",
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  };
}

const THEME_KEY = "depthroute.theme.mode";

type ThemeContextValue = {
  palette: Palette;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  palette: dark,
  mode: "dark",
  setMode: () => {},
  toggle: () => {},
  ready: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = (await storage.getItem(THEME_KEY, "")) as string | null;
      if (!alive) return;
      if (saved === "dark" || saved === "light") {
        setModeState(saved);
      } else {
        // No stored preference — follow the OS once, then remember explicit picks.
        setModeState(Appearance.getColorScheme() === "light" ? "light" : "dark");
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    storage.setItem(THEME_KEY, m);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      storage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ palette: palettes[mode], mode, setMode, toggle, ready }),
    [mode, setMode, toggle, ready],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

/** The active palette. */
export function useTheme(): Palette {
  return useContext(ThemeContext).palette;
}

/** Mode + setters, for the drawer's theme switch. */
export function useThemeMode() {
  const { mode, setMode, toggle, ready } = useContext(ThemeContext);
  return { mode, setMode, toggle, ready };
}

/**
 * Builds a StyleSheet from the active palette, memoised per palette.
 * `factory` must be a module-scope constant so the memo key stays stable.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: Palette) => T,
): T {
  const palette = useTheme();
  return useMemo(() => factory(palette), [factory, palette]);
}
