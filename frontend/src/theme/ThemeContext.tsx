// Theme — dark and light, per the "DepthRoute Mobile Auth" design.
//
// Three modes: "system" follows the device, "dark" and "light" pin it. The
// choice is persisted so the app opens the way the customer left it.
//
// Screens read the palette through useTheme(); the exported `colors` in
// src/theme.ts stays bound to the dark palette so screens that have not been
// migrated yet keep rendering exactly as before.
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type Palette } from "@/src/theme";
import { storage } from "@/src/utils/storage";

export type ThemeMode = "system" | "dark" | "light";
export type ThemeName = "dark" | "light";

const KEY = "ui_theme_mode";

type Ctx = {
  /** What the user chose. */
  mode: ThemeMode;
  /** What is actually rendered right now. */
  theme: ThemeName;
  colors: Palette;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  /** Convenience for a single toggle control. */
  toggle: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await storage.getItem<ThemeMode>(KEY, "system");
      if (alive && (saved === "dark" || saved === "light" || saved === "system")) {
        setModeState(saved);
      }
    })();
    return () => { alive = false; };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void storage.setItem(KEY, m);
  }, []);

  const theme: ThemeName =
    mode === "system" ? (system === "light" ? "light" : "dark") : mode;

  const toggle = useCallback(() => {
    setMode(theme === "dark" ? "light" : "dark");
  }, [theme, setMode]);

  const value = useMemo<Ctx>(() => ({
    mode,
    theme,
    colors: theme === "light" ? lightColors : darkColors,
    isDark: theme === "dark",
    setMode,
    toggle,
  }), [mode, theme, setMode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The active palette plus the controls to change it.
 *
 * Safe before the provider mounts: falls back to dark rather than throwing, so
 * a component rendered outside the tree still has usable colours.
 */
export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    mode: "system",
    theme: "dark",
    colors: darkColors,
    isDark: true,
    setMode: () => {},
    toggle: () => {},
  };
}
