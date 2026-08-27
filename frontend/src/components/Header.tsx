// App header — the single header pattern from DepthRoute App v2.
//
// Left: menu (or back) + title. Right: caller-supplied slot, bell with a real
// unread badge, and SIP registration as a tinted, bordered PILL. The pill is
// the design's key change here: on a light surface, coloured text on a plain
// chip stopped carrying enough signal, so the state now has its own fill and
// edge and stays legible in both themes.
import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { spacing, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { useSipEngine } from "@/src/sip/SipEngineContext";

/** Short pill wording — the header has little room, so state names stay terse. */
function sipPill(status: string, c: Palette) {
  switch (status) {
    case "registered":
      return { label: "Registered", fg: c.green, bg: c.greenSoft, br: c.greenBorder };
    case "connecting":
      return { label: "Connecting", fg: c.yellow, bg: c.yellowSoft, br: c.yellowBorder };
    case "registration_failed":
      return { label: "Reg. failed", fg: c.red, bg: c.redSoft, br: c.redBorder };
    case "unsupported":
      return { label: "SIP N/A", fg: c.yellow, bg: c.yellowSoft, br: c.yellowBorder };
    case "error":
      return { label: "SIP error", fg: c.red, bg: c.redSoft, br: c.redBorder };
    case "unregistered":
      return { label: "Unregistered", fg: c.textMuted, bg: c.cardAlt, br: c.border };
    case "disconnected":
    default:
      return { label: "Disconnected", fg: c.textMuted, bg: c.cardAlt, br: c.border };
  }
}

type Props = {
  title: string;
  showMenu?: boolean;
  onMenu?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
  showBell?: boolean;
  showSip?: boolean;
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
  unread = 0, // real count must be passed in; never fabricate a badge
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { status } = useSipEngine();
  const sip = sipPill(status, colors);

  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]} testID="app-header">
      <View style={s.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} testID="header-back-button" style={s.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
        ) : showMenu ? (
          <TouchableOpacity onPress={onMenu} testID="header-menu-button" style={s.iconBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={s.iconBtn} />
        )}
        {!!title && (
          <Text style={s.title} testID="header-title" numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>

      <View style={s.rightRow}>
        {right}
        {showBell && (
          <TouchableOpacity
            style={s.bell}
            onPress={() => router.push("/notifications")}
            testID="header-bell-button"
          >
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            {unread > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {showSip && (
          <TouchableOpacity
            style={[s.sipPill, { backgroundColor: sip.bg, borderColor: sip.br }]}
            testID="header-sip-pill"
            onPress={() => router.push("/sip-accounts")}
            accessibilityRole="button"
            accessibilityLabel={`SIP ${sip.label}`}
          >
            <View style={[s.sipDot, { backgroundColor: sip.fg }]} />
            <Text style={[s.sipText, { color: sip.fg }]}>{sip.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.bg,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
      gap: spacing.sm,
    },
    row: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
    iconBtn: { padding: 2 },
    title: { fontSize: 21, fontWeight: "700", color: c.text, letterSpacing: -0.2, flexShrink: 1 },
    rightRow: { flexDirection: "row", alignItems: "center", gap: 10 },

    bell: { padding: 4, position: "relative" },
    badge: {
      position: "absolute",
      top: -1,
      right: -1,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.red,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    // Sits on the solid red badge, so it is white in both themes.
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
}
