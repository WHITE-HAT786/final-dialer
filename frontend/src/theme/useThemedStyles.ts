// Project convention for themed styles.
//
// WHY THIS EXISTS
// A module-scope `StyleSheet.create({ ... colors.card ... })` freezes whichever
// palette was imported at load time, so the screen can never follow a theme
// change. Wrapping the same object in makeThemedStyles() keeps the familiar
// shape but resolves the palette at render time.
//
// HOW TO USE IT
//
//   const useStyles = makeThemedStyles((c, dark) =>
//     StyleSheet.create({
//       card: { backgroundColor: c.card, borderColor: c.border },
//     }),
//   );
//
//   export default function Screen() {
//     const styles = useStyles();          // follows the active theme
//     const { colors } = useTheme();       // for inline props: icon colours etc.
//     ...
//   }
//
// The factory runs ONCE PER THEME, not once per render: results are cached by
// theme name, so switching dark <-> light reuses the sheet built earlier.
//
// DO NOT reintroduce `import { colors } from "@/src/theme"` at module scope in
// a component file — that is the exact pattern this replaces. The `colors`
// export remains only for non-React modules and legacy call sites.
import { useMemo } from "react";
import type { Palette } from "@/src/theme";
import { useTheme, type ThemeName } from "@/src/theme/ThemeContext";

export function makeThemedStyles<T extends Record<string, unknown>>(
  factory: (colors: Palette, dark: boolean) => T,
) {
  const cache = new Map<ThemeName, T>();

  return function useStyles(): T {
    const { colors, theme, isDark } = useTheme();
    return useMemo(() => {
      const hit = cache.get(theme);
      if (hit) return hit;
      const made = factory(colors, isDark);
      cache.set(theme, made);
      return made;
    }, [theme, colors, isDark]);
  };
}
