import React, { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

/**
 * DepthGlobe — the rotating dot-sphere behind the sign-in card.
 *
 * Ported from the design's canvas-2D `globe.jsx`. React Native has no canvas,
 * so each dot is an absolutely-positioned view and the Fibonacci-sphere
 * projection runs as a Reanimated worklet on the UI thread. The dot count is
 * well below the design's 1100 — the card and the scrim cover most of the
 * sphere, so the extra density is invisible but not free.
 */

const DOTS = 150;
const TILT = -0.42;
const SPIN = 0.13; // radians/second — same rate as the design
const DOT_BASE = 4; // px; scaled per-dot by depth

/** The design's four "traffic" coordinates, pulsing on the sphere surface. */
const ROUTES: [number, number, number][] = [
  [0.4, 0.55, -0.7],
  [-0.75, 0.2, 0.6],
  [0.15, -0.6, 0.78],
  [-0.5, -0.35, -0.79],
];

type Props = {
  size?: number;
  theme?: "dark" | "light";
  accent?: string;
};

function fibonacciSphere(n: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = golden * i;
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return pts;
}

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type DotProps = {
  point: [number, number, number];
  angle: SharedValue<number>;
  center: number;
  radius: number;
  accent: string;
  dark: boolean;
};

function Dot({ point, angle, center, radius, accent, dark }: DotProps) {
  const [px, py, pz] = point;
  const minAlpha = dark ? 0.1 : 0.08;
  const alphaRange = dark ? 0.72 : 0.52;

  const style = useAnimatedStyle(() => {
    const a = angle.value;
    const x = px * Math.cos(a) - pz * Math.sin(a);
    const z = px * Math.sin(a) + pz * Math.cos(a);
    const y = py * Math.cos(TILT) - z * Math.sin(TILT);
    const zz = py * Math.sin(TILT) + z * Math.cos(TILT);

    const depth = (zz + 1) / 2;
    const diameter = 2 * (0.7 + depth * 1.15);

    return {
      opacity: minAlpha + depth * alphaRange,
      transform: [
        { translateX: center + x * radius },
        { translateY: center - y * radius },
        { scale: diameter / DOT_BASE },
      ],
    };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: accent }, style]} />;
}

type RouteProps = DotProps & { index: number; clock: SharedValue<number> };

function RoutePulse({ point, angle, clock, center, radius, accent, dark, index }: RouteProps) {
  const [px, py, pz] = point;

  const core = useAnimatedStyle(() => {
    const a = angle.value;
    const x = px * Math.cos(a) - pz * Math.sin(a);
    const z = px * Math.sin(a) + pz * Math.cos(a);
    const y = py * Math.cos(TILT) - z * Math.sin(TILT);
    const zz = py * Math.sin(TILT) + z * Math.cos(TILT);
    return {
      // Hidden while the point is on the far side of the sphere.
      opacity: zz < -0.1 ? 0 : 1,
      transform: [{ translateX: center + x * radius }, { translateY: center - y * radius }],
    };
  });

  const ring = useAnimatedStyle(() => {
    const a = angle.value;
    const x = px * Math.cos(a) - pz * Math.sin(a);
    const z = px * Math.sin(a) + pz * Math.cos(a);
    const y = py * Math.cos(TILT) - z * Math.sin(TILT);
    const zz = py * Math.sin(TILT) + z * Math.cos(TILT);
    const pulse = 0.5 + 0.5 * Math.sin(clock.value / 900 + index * 1.7);
    const r = 3 + pulse * 9;
    return {
      opacity: zz < -0.1 ? 0 : 0.5 * (1 - pulse),
      transform: [
        { translateX: center + x * radius },
        { translateY: center - y * radius },
        { scale: (r * 2) / 24 },
      ],
    };
  });

  return (
    <>
      <Animated.View
        style={[styles.pulseRing, { borderColor: accent }, ring]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.routeCore, { backgroundColor: dark ? "#FFFFFF" : accent }, core]}
        pointerEvents="none"
      />
    </>
  );
}

export default function DepthGlobe({ size = 520, theme = "dark", accent = "#2F80ED" }: Props) {
  const dark = theme !== "light";
  const center = size / 2;
  const radius = size * 0.38;

  const points = useMemo(() => fibonacciSphere(DOTS), []);
  const angle = useSharedValue(0);
  const clock = useSharedValue(0);

  // Respect the OS "reduce motion" setting — the globe holds a fixed angle.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (active) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  useFrameCallback((frame) => {
    const dt = frame.timeSincePreviousFrame ?? 16;
    clock.value += dt;
    angle.value += (dt / 1000) * SPIN;
  }, !reduceMotion);

  const haloBase = { position: "absolute" as const, borderRadius: 9999 };

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* Radial halo, approximated with stacked circles (no radial gradient in RN). */}
      <View
        style={[
          haloBase,
          {
            left: center - radius * 1.55,
            top: center - radius * 1.55,
            width: radius * 3.1,
            height: radius * 3.1,
            backgroundColor: rgba(accent, dark ? 0.05 : 0.03),
          },
        ]}
      />
      <View
        style={[
          haloBase,
          {
            left: center - radius * 1.1,
            top: center - radius * 1.1,
            width: radius * 2.2,
            height: radius * 2.2,
            backgroundColor: rgba(accent, dark ? 0.07 : 0.045),
          },
        ]}
      />
      <View
        style={[
          haloBase,
          {
            left: center - radius * 0.7,
            top: center - radius * 0.7,
            width: radius * 1.4,
            height: radius * 1.4,
            backgroundColor: rgba(accent, dark ? 0.09 : 0.06),
          },
        ]}
      />

      {/* Rim */}
      <View
        style={[
          haloBase,
          {
            left: center - radius,
            top: center - radius,
            width: radius * 2,
            height: radius * 2,
            borderWidth: 1,
            borderColor: rgba(accent, dark ? 0.3 : 0.24),
          },
        ]}
      />

      {points.map((p, i) => (
        <Dot
          key={i}
          point={p}
          angle={angle}
          center={center}
          radius={radius}
          accent={accent}
          dark={dark}
        />
      ))}

      {ROUTES.map((p, i) => (
        <RoutePulse
          key={`r${i}`}
          index={i}
          point={p}
          angle={angle}
          clock={clock}
          center={center}
          radius={radius}
          accent={accent}
          dark={dark}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    left: -DOT_BASE / 2,
    top: -DOT_BASE / 2,
    width: DOT_BASE,
    height: DOT_BASE,
    borderRadius: DOT_BASE / 2,
  },
  routeCore: {
    position: "absolute",
    left: -2.4,
    top: -2.4,
    width: 4.8,
    height: 4.8,
    borderRadius: 2.4,
  },
  pulseRing: {
    position: "absolute",
    left: -12,
    top: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.2,
  },
});
