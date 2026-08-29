import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { spacing, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { useSipEngine } from "@/src/sip/SipEngineContext";

/**
 * v2 header — one pattern for every screen: leading menu/back, title (or the
 * brand lockup on the dashboard), bell with badge, and registration state as a
 * tinted pill rather than coloured text.
 */

type PillTone = "success" | "warn" | "danger" | "neutral";

function sipPill(status: string): { label: string; tone: PillTone } {
  switch (status) {
    case "registered": return { label: "Registered", tone: "success" };
    case "connecting": return { label: "Connecting…", tone: "warn" };
    case "registration_failed": return { label: "Reg. failed", tone: "danger" };
    case "unsupported": return { label: "SIP N/A", tone: "warn" };
    case "error": return { label: "SIP error", tone: "danger" };
    case "unregistered": return { label: "Unregistered", tone: "neutral" };
    case "disconnected":
    default: return { label: "Disconnected", tone: "neutral" };
  }
}

export function toneColors(c: Palette, tone: PillTone) {
  switch (tone) {
    case "success": return { fg: c.success, bg: c.successSoft, border: c.successBorder };
    case "warn": return { fg: c.warn, bg: c.warnSoft, border: c.warnBorder };
    case "danger": return { fg: c.danger, bg: c.dangerSoft, border: c.dangerBorder };
    default: return { fg: c.muted, bg: c.card, border: c.border };
  }
}

/** The brand lockup used in the dashboard header. */
export function BrandLockup({ size = 24, label = true }: { size?: number; label?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.29,
          backgroundColor: c.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name="waveform" size={size * 0.62} color={c.onPrimary} />
      </View>
      {label && (
        <Text style={{ color: c.text, fontSize: size * 0.58, fontWeight: "700" }}>
          Depth Route
        </Text>
      )}
    </View>
  );
}

type Props = {
  title: string;
  showMenu?: boolean;
  onMenu?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
  showBell?: boolean;
  showSip?: boolean;
  /** Renders the brand lockup in place of the title (dashboard). */
  brand?: boolean;
  /** Call-logs draws its own tab strip flush under the header. */
  hairline?: boolean;
  unread?: number;
};

export default function Header({
  title,
  showMenu = true,
  onMenu,
  showBack = false,
  right,
  showBell = true,
  showSip = true,
  brand = false,
  hairline = true,
  unread = 3,
}: Props) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status } = useSipEngine();
  const pill = sipPill(status);
  const tone = toneColors(c, pill.tone);

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 10 },
        hairline && styles.headerLine,
      ]}
      testID="app-header"
    >
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} testID="header-back-button" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
      ) : showMenu ? (
        <TouchableOpacity onPress={onMenu} testID="header-menu-button" style={styles.iconBtn}>
          <Ionicons name="menu" size={24} color={c.text} />
        </TouchableOpacity>
      ) : null}

      {brand ? (
        <View style={{ flex: 1 }}>
          <BrandLockup />
        </View>
      ) : (
        <Text style={styles.title} testID="header-title" numberOfLines={1}>
          {title}
        </Text>
      )}

      {right}

      {showBell && (
        <TouchableOpacity
          style={styles.bell}
          onPress={() => router.push("/notifications")}
          testID="header-bell-button"
        >
          <Ionicons name="notifications-outline" size={21} color={c.text} />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {showSip && (
        <TouchableOpacity
          style={[styles.sipPill, { backgroundColor: tone.bg, borderColor: tone.border }]}
          testID="header-sip-pill"
          onPress={() => router.push("/sip-accounts")}
        >
          <View style={[styles.sipDot, { backgroundColor: tone.fg }]} />
          <Text style={[styles.sipText, { color: tone.fg }]}>{pill.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.bg,
      gap: 10,
    },
    headerLine: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: c.borderSoft },
    iconBtn: { paddingVertical: 2 },
    title: { flex: 1, fontSize: 21, fontWeight: "700", letterSpacing: -0.2, color: c.text },
    bell: { position: "relative" },
    badge: {
      position: "absolute",
      top: -5,
      right: -6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeText: { color: c.onPrimary, fontSize: 9.5, fontWeight: "700" },
    sipPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    sipDot: { width: 6, height: 6, borderRadius: 3 },
    sipText: { fontSize: 11, fontWeight: "600" },
  });
