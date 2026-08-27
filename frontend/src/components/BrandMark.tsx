// DepthRoute brand mark — theme-aware. Ships both variants so the logo reads
// correctly on any surface:
//   • dark surfaces  -> the white mark  (depthroute-mark-dark.png)
//   • light surfaces -> the dark mark   (depthroute-mark.png)
// The app's palette is currently dark, so callers on a dark surface can force
// `theme="dark"`. Left on "auto", it follows the device color scheme.
import React from "react";
import { Image, useColorScheme, StyleProp, ImageStyle } from "react-native";

const MARK_DARK = require("../../assets/images/depthroute-mark-dark.png"); // white mark → dark bg
const MARK_LIGHT = require("../../assets/images/depthroute-mark.png"); // dark mark → light bg
const ASPECT = 193 / 183; // source marks are 183×193

type Props = {
  /** Rendered width in px; height derives from the mark's aspect ratio. */
  size?: number;
  /** Force a variant. Omit (or "auto") to follow the device color scheme. */
  theme?: "light" | "dark" | "auto";
  style?: StyleProp<ImageStyle>;
};

export function BrandMark({ size = 56, theme = "auto", style }: Props) {
  const scheme = useColorScheme();
  // Treat an unknown scheme as dark, since the app surface is dark by default.
  const isDark = theme === "auto" ? scheme !== "light" : theme === "dark";
  return (
    <Image
      source={isDark ? MARK_DARK : MARK_LIGHT}
      style={[{ width: size, height: Math.round(size * ASPECT) }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Depth Route"
    />
  );
}
