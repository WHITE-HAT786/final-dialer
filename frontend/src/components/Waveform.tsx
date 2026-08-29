import React from "react";
import { View } from "react-native";
import { useTheme } from "@/src/theme";

/**
 * The audio scrubber used by voicemail and recording cards.
 *
 * The bar heights are the fixed sequence from the design rather than random
 * values — a `Math.random()` waveform reshuffles on every re-render, so the
 * track appeared to jitter whenever the screen updated.
 */
const BARS = [
  7, 12, 18, 9, 22, 14, 20, 11, 24, 16, 8, 19, 13, 23, 10, 17, 21, 12, 15, 20,
  9, 18, 11, 22, 14, 8, 20, 16, 12, 19, 23, 10, 17, 13, 21, 15, 9, 18, 12, 16,
];

export default function Waveform({
  tone,
  played = 15,
  height = 28,
}: {
  /** Colour of the already-played bars. */
  tone: string;
  /** How many of the 40 bars are played. */
  played?: number;
  height?: number;
}) {
  const c = useTheme();
  return (
    <View
      style={{ flex: 1, height, flexDirection: "row", alignItems: "center", gap: 2, overflow: "hidden" }}
    >
      {BARS.map((h, i) => (
        <View
          key={i}
          style={{
            width: 2,
            height: h,
            borderRadius: 1,
            backgroundColor: i < played ? tone : c.dim,
          }}
        />
      ))}
    </View>
  );
}
