// DepthGlobe — the rotating dot-sphere behind the sign-in card.
//
// A React Native port of the design's Canvas 2D globe. The web version draws
// 1100 dots per frame into a canvas; RN has no 2D canvas here, so each dot is a
// View and the count is tuned down to stay smooth on a mid-range handset. The
// maths is the same: points on a Fibonacci sphere, rotated about Y, tilted, and
// projected — with nearer dots drawn larger and brighter.
//
// Rotation runs on the UI thread via Reanimated, so it never competes with the
// JS thread during sign-in.
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
  type SharedValue,
} from "react-native-reanimated";

type Props = {
  size?: number;
  theme?: "dark" | "light";
  accent?: string;
  /** Dot count. The web design uses 1100; RN needs far fewer Views. */
  dots?: number;
};

/** Evenly distributed points on a unit sphere (Fibonacci spiral). */
function spherePoints(n: number): [number, number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = golden * i;
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return pts;
}

const TILT = -0.42;

function Dot({
  p, angle, radius, centre, accent, dark,
}: {
  p: [number, number, number];
  angle: SharedValue<number>;
  radius: number;
  centre: number;
  accent: string;
  dark: boolean;
}) {
  const style = useAnimatedStyle(() => {
    "worklet";
    const a = angle.value;
    const x = p[0] * Math.cos(a) - p[2] * Math.sin(a);
    const z = p[0] * Math.sin(a) + p[2] * Math.cos(a);
    const y = p[1] * Math.cos(TILT) - z * Math.sin(TILT);
    const zz = p[1] * Math.sin(TILT) + z * Math.cos(TILT);

    const depth = (zz + 1) / 2;            // 0 = far side, 1 = near side
    const d = 1.4 + depth * 2.3;           // diameter
    return {
      left: centre + x * radius - d / 2,
      top: centre - y * radius - d / 2,
      width: d,
      height: d,
      borderRadius: d / 2,
      opacity: (dark ? 0.1 : 0.08) + depth * (dark ? 0.72 : 0.52),
    };
  }, [radius, centre, dark]);

  return <Animated.View style={[styles.dot, { backgroundColor: accent }, style]} />;
}

export default function DepthGlobe({
  size = 540, theme = "dark", accent = "#2F80ED", dots = 150,
}: Props) {
  const dark = theme !== "light";
  const angle = useSharedValue(0);
  const points = useMemo(() => spherePoints(dots), [dots]);

  React.useEffect(() => {
    // 0.13 rad/s in the design — one turn is ~48s, a slow drift.
    angle.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 48000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [angle]);

  const centre = size / 2;
  const radius = size * 0.38;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* Rim — the sphere's silhouette. */}
      <View
        style={[
          styles.rim,
          {
            left: centre - radius,
            top: centre - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            borderColor: accent,
            opacity: dark ? 0.3 : 0.24,
          },
        ]}
      />
      {points.map((p, i) => (
        <Dot
          key={i}
          p={p}
          angle={angle}
          radius={radius}
          centre={centre}
          accent={accent}
          dark={dark}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: "absolute" },
  rim: { position: "absolute", borderWidth: 1 },
});
