// Navigation drawer — implements the "Navigation drawer" frame of
// DepthRoute App v2, in both themes.
//
// Design notes carried over from that frame:
//   • the drawer sits on `bgElev`, not the page background, so it reads as a
//     layer above the screen it covers;
//   • the account is a CARD, and SIP registration is a status PILL beneath it
//     rather than coloured text inside the row — a failed registration is a
//     thing you can act on, so it carries a Retry;
//   • rows use `text` at weight 500 with a muted icon, and the active row is a
//     primary-soft fill with a primary icon and label.
//
// Routes are the app's real ones. The design frame lists an IVR entry, which
// this build replaced with Audio Library and Recharge; those ship instead.
import React, { useEffect, useMemo, useRef } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, ScrollView, Pressable,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { useAuth } from "@/src/AuthContext";
import { useSipEngine } from "@/src/sip/SipEngineContext";
import { BrandMark } from "@/src/components/BrandMark";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(SCREEN_W * 0.86, 330);

type MenuItem = { key: string; label: string; icon: any; route: string; badge?: string };

const MAIN: MenuItem[] = [
  { key: "dashboard", label: "Dashboard", icon: ["ion", "home"], route: "/(tabs)/dashboard" },
  { key: "dialer", label: "Dialer", icon: ["ion", "call"], route: "/(tabs)/dialer" },
  { key: "contacts", label: "Contacts", icon: ["ion", "person"], route: "/(tabs)/contacts" },
  { key: "call-logs", label: "Call Logs", icon: ["ion", "time"], route: "/(tabs)/call-logs" },
  { key: "voicemails", label: "Voicemails", icon: ["mc", "voicemail"], route: "/voicemails" },
  { key: "sms", label: "SMS", icon: ["ion", "chatbubble"], route: "/sms", badge: "New" },
  { key: "recordings", label: "Recordings", icon: ["ion", "mic"], route: "/recordings" },
  { key: "reports", label: "Reports", icon: ["ion", "bar-chart"], route: "/reports" },
];

const MANAGE: MenuItem[] = [
  { key: "sip", label: "SIP Accounts", icon: ["mc", "server"], route: "/sip-accounts" },
  { key: "number", label: "Number", icon: ["ion", "call-outline"], route: "/numbers" },
  { key: "recharge", label: "Recharge", icon: ["mc", "wallet-plus-outline"], route: "/recharge" },
  { key: "audio-library", label: "Audio Library", icon: ["mc", "music-box-multiple"], route: "/audio-library" },
  { key: "plans", label: "Plans", icon: ["ion", "ribbon"], route: "/plans" },
  { key: "billing", label: "Billing", icon: ["ion", "wallet"], route: "/billing" },
];

// No numeric badge here: a count must come from real data, never a constant.
const SUPPORT: MenuItem[] = [
  { key: "help", label: "Help & Support", icon: ["ion", "help-circle"], route: "/support" },
  { key: "notifications", label: "Notifications", icon: ["ion", "notifications"], route: "/notifications" },
];

function Icon({ icon, size, color }: { icon: any; size: number; color: string }) {
  const [family, name] = icon;
  if (family === "mc") return <MaterialCommunityIcons name={name} size={size} color={color} />;
  return <Ionicons name={name} size={size} color={color} />;
}

/** Maps engine status onto the design's pill: tone, wording, and whether to offer Retry. */
function sipPill(status: string, c: Palette) {
  switch (status) {
    case "registered":
      return { text: "SIP Registered", fg: c.green, bg: c.greenSoft, br: c.greenBorder, retry: false };
    case "connecting":
      return { text: "Connecting…", fg: c.yellow, bg: c.yellowSoft, br: c.yellowBorder, retry: false };
    case "registration_failed":
      return { text: "Registration failed", fg: c.red, bg: c.redSoft, br: c.redBorder, retry: true };
    case "error":
      return { text: "SIP error", fg: c.red, bg: c.redSoft, br: c.redBorder, retry: true };
    case "unsupported":
      return { text: "SIP unsupported", fg: c.yellow, bg: c.yellowSoft, br: c.yellowBorder, retry: false };
    case "unregistered":
      return { text: "Unregistered", fg: c.textMuted, bg: c.cardAlt, br: c.border, retry: true };
    default:
      return { text: "Disconnected", fg: c.textMuted, bg: c.cardAlt, br: c.border, retry: true };
  }
}

export default function Sidebar({
  visible, onClose, active,
}: {
  visible: boolean;
  onClose: () => void;
  active?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggle } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { user, logout } = useAuth();
  // `connect` is the engine's existing re-registration entry point; Retry only
  // calls it, it does not change any SIP behaviour.
  const { status, connect } = useSipEngine();
  const pill = sipPill(status, colors);

  const slide = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: visible ? 0 : -DRAWER_W, duration: 240, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: visible ? 1 : 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [visible, slide, backdrop]);

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 200);
  };

  const doLogout = async () => {
    onClose();
    await logout();
    router.replace("/login");
  };

  const initials = (user?.name || "JD").split(" ").map((w) => w[0]).slice(0, 2).join("");
  const ext = (user as any)?.ext;
  const line = (user as any)?.username;

  const renderItem = (item: MenuItem) => {
    const on = active === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        style={[s.item, on && s.itemActive]}
        onPress={() => go(item.route)}
        testID={`sidebar-item-${item.key}`}
        accessibilityRole="button"
        accessibilityState={on ? { selected: true } : undefined}
      >
        <Icon icon={item.icon} size={20} color={on ? colors.primary : colors.textMuted} />
        <Text style={[s.itemText, on && s.itemTextActive]}>{item.label}</Text>
        {!!item.badge && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{item.badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.backdrop, { opacity: backdrop }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} testID="sidebar-backdrop" />
      </Animated.View>

      <Animated.View style={[s.drawer, { transform: [{ translateX: slide }] }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.brandRow}>
            <BrandMark size={32} theme={isDark ? "dark" : "light"} />
            <Text style={s.brandText}>Depth Route</Text>
          </View>

          <TouchableOpacity style={s.userCard} onPress={() => go("/profile")} testID="sidebar-user">
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.userName} numberOfLines={1}>{user?.name || "Account"}</Text>
              <Text style={s.userSub} numberOfLines={1}>
                {ext ? <Text style={s.userExt}>Ext {ext}</Text> : null}
                {ext && line ? " · " : ""}
                {line || ""}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Registration state as an actionable pill, per the design frame. */}
          <View
            style={[s.sipPill, { backgroundColor: pill.bg, borderColor: pill.br }]}
            testID="sidebar-sip-pill"
          >
            <View style={[s.sipDot, { backgroundColor: pill.fg }]} />
            <Text style={[s.sipText, { color: pill.fg }]} numberOfLines={1}>{pill.text}</Text>
            {pill.retry && (
              <TouchableOpacity onPress={() => void connect()} testID="sidebar-sip-retry" hitSlop={8}>
                <Text style={[s.sipRetry, { color: pill.fg }]}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.divider} />
          <Text style={s.sectionLabel}>MAIN</Text>
          {MAIN.map(renderItem)}

          <View style={s.divider} />
          <Text style={s.sectionLabel}>MANAGE</Text>
          {MANAGE.map(renderItem)}

          <View style={s.divider} />
          <Text style={s.sectionLabel}>SUPPORT</Text>
          {SUPPORT.map(renderItem)}

          <View style={s.divider} />
          <TouchableOpacity style={s.item} onPress={doLogout} testID="sidebar-logout">
            <Ionicons name="log-out-outline" size={20} color={colors.red} />
            <Text style={[s.itemText, s.logoutText]}>Log out</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) + 22 }]}>
          <Text style={s.footerText}>v2.5.0</Text>
          <TouchableOpacity
            style={s.themeBtn}
            onPress={toggle}
            testID="sidebar-theme-toggle"
            accessibilityRole="button"
            accessibilityLabel="Switch theme"
            hitSlop={8}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={15}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.scrim },
    drawer: {
      position: "absolute", left: 0, top: 0, bottom: 0, width: DRAWER_W,
      backgroundColor: c.bgElev,
      borderRightWidth: 1, borderRightColor: c.border,
    },

    brandRow: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 18 },
    brandText: { color: c.text, fontSize: 19, fontWeight: "700", letterSpacing: -0.2 },

    userCard: {
      flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
      borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    avatar: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: c.primarySoft,
      alignItems: "center", justifyContent: "center",
    },
    avatarText: { color: c.primary, fontSize: 15, fontWeight: "700" },
    userName: { color: c.text, fontSize: 14.5, fontWeight: "600" },
    userSub: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    userExt: { color: c.primary, fontWeight: "600" },

    sipPill: {
      flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8,
      paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1,
    },
    sipDot: { width: 6, height: 6, borderRadius: 3 },
    sipText: { flex: 1, fontSize: 12, fontWeight: "600" },
    sipRetry: { fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },

    divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    sectionLabel: {
      color: c.textDim, fontSize: 11, fontWeight: "700",
      letterSpacing: 1.3, marginLeft: 12, marginBottom: 6,
    },

    item: {
      flexDirection: "row", alignItems: "center", gap: 13,
      paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10,
    },
    itemActive: { backgroundColor: c.primarySoft },
    itemText: { color: c.text, fontSize: 14.5, fontWeight: "500", flex: 1 },
    itemTextActive: { color: c.primary, fontWeight: "600" },
    logoutText: { color: c.red, fontWeight: "600" },

    badge: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7,
      backgroundColor: c.primary,
    },
    badgeText: { color: c.onPrimary, fontSize: 10, fontWeight: "700" },

    footer: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingTop: 12, paddingHorizontal: 20,
      borderTopWidth: 1, borderTopColor: c.border,
      backgroundColor: c.bgElev,
    },
    footerText: { color: c.textDim, fontSize: 11.5 },
    themeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      alignItems: "center", justifyContent: "center",
    },
  });
}
