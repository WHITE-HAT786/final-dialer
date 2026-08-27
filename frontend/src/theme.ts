// Depth Route Dialer - Design tokens
//
// Values come from "DepthRoute App v2" in the Claude Design project: two
// palettes with identical keys, so a component swaps themes by swapping the
// object. `colors` stays bound to the dark palette because unmigrated screens
// still import it directly; themed screens use useTheme() instead.
//
// TOKEN GUIDE
//   bg / bgElev      page background / elevated chrome (tab bar, drawer, sheets)
//   card / cardAlt   content surfaces
//   input            form field fill
//   border           default hairline; borderSoft = quieter divider,
//                    borderStrong = emphasised edge
//   text/Muted/Dim   primary / secondary / tertiary type
//   *Soft            ~10% tint of a status hue, for icon chips and pills
//   *Border          the matching pill border
//   primaryDim etc.  legacy solid tints, kept so older screens keep rendering
export const darkColors = {
  bg: "#050B1A",
  bgAlt: "#0A1224",
  bgElev: "#0A1224",
  card: "#0F1A30",
  cardAlt: "#111C33",
  input: "#0A1224",
  border: "#1E2A45",
  borderSoft: "#172136",
  borderStrong: "#2A3A5C",
  text: "#FFFFFF",
  textMuted: "#8891A6",
  textDim: "#737E96",
  primary: "#2F80ED",
  primaryDim: "#1F3A6B",
  primarySoft: "rgba(47,128,237,0.14)",
  primaryBorder: "rgba(47,128,237,0.32)",
  ring: "rgba(47,128,237,0.32)",
  onPrimary: "#FFFFFF",
  green: "#22C55E",
  greenDim: "#0F3B22",
  greenSoft: "rgba(34,197,94,0.14)",
  greenBorder: "rgba(34,197,94,0.32)",
  red: "#EF4444",
  redDim: "#3B1518",
  redSoft: "rgba(239,68,68,0.14)",
  redBorder: "rgba(239,68,68,0.32)",
  yellow: "#F59E0B",
  yellowDim: "#3B2810",
  yellowSoft: "rgba(245,158,11,0.14)",
  yellowBorder: "rgba(245,158,11,0.32)",
  purple: "#A855F7",
  purpleDim: "#2A163F",
  purpleSoft: "rgba(168,85,247,0.14)",
  teal: "#14B8A6",
  tealDim: "#0B3A36",
  tealSoft: "rgba(20,184,166,0.14)",
  orange: "#F97316",
  orangeDim: "#3A1E10",
  orangeSoft: "rgba(249,115,22,0.14)",
  pink: "#EC4899",
  /** Drawer/modal scrim. */
  scrim: "rgba(2,6,15,0.62)",
};

/** Light palette — same keys, values from the design's light theme row. */
export const lightColors: typeof darkColors = {
  bg: "#F5F7FB",
  bgAlt: "#F7F9FC",
  bgElev: "#FFFFFF",
  card: "#FFFFFF",
  cardAlt: "#F7F9FC",
  input: "#FFFFFF",
  border: "#E2E7F0",
  borderSoft: "#EDF1F7",
  borderStrong: "#D3DAE6",
  text: "#0B1424",
  textMuted: "#5A6478",
  textDim: "#6E778A",
  primary: "#2F80ED",
  primaryDim: "#E4EEFC",
  primarySoft: "rgba(47,128,237,0.09)",
  primaryBorder: "rgba(47,128,237,0.28)",
  ring: "rgba(47,128,237,0.18)",
  onPrimary: "#FFFFFF",
  // Status hues are darkened for light surfaces so they stay AA-readable.
  green: "#15803D",
  greenDim: "#E6F6EC",
  greenSoft: "rgba(21,128,61,0.08)",
  greenBorder: "rgba(21,128,61,0.24)",
  red: "#DC2626",
  redDim: "#FDECEC",
  redSoft: "rgba(220,38,38,0.07)",
  redBorder: "rgba(220,38,38,0.24)",
  yellow: "#B45309",
  yellowDim: "#FDF3E3",
  yellowSoft: "rgba(180,83,9,0.08)",
  yellowBorder: "rgba(180,83,9,0.24)",
  purple: "#7E22CE",
  purpleDim: "#F1E9FE",
  purpleSoft: "rgba(126,34,206,0.08)",
  teal: "#0F766E",
  tealDim: "#E2F5F3",
  tealSoft: "rgba(15,118,110,0.08)",
  orange: "#C2410C",
  orangeDim: "#FDEDE3",
  orangeSoft: "rgba(194,65,12,0.08)",
  pink: "#DB2777",
  scrim: "rgba(15,26,48,0.42)",
};

export type Palette = typeof darkColors;

/** Back-compat: screens that have not been themed yet keep the dark palette. */
export const colors = darkColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

/**
 * In-app card lift. The design gives light surfaces a 1px hairline shadow and
 * dark ones none — on a dark page a drop shadow reads as mud, not elevation.
 * Spread into a style object: `{ ...cardShadow(isDark) }`.
 */
export const cardShadow = (dark: boolean) =>
  dark
    ? null
    : {
        shadowColor: "#101828",
        shadowOpacity: 0.07,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      };

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: "700" as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.textMuted },
  tiny: { fontSize: 11, color: colors.textDim },
};
