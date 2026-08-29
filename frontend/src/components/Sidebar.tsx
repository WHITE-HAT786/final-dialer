import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, useThemeMode, useThemedStyles, type Palette } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";
import { useSipEngine } from "@/src/sip/SipEngineContext";
import { BrandLockup } from "./Header";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(SCREEN_W * 0.84, 330);

type MenuItem = { key: string; label: string; icon: any; route: string; badge?: string };

const MAIN: MenuItem[] = [
  { key: "dashboard", label: "Dashboard", icon: ["ion", "home-outline"], route: "/(tabs)/dashboard" },
  { key: "dialer", label: "Dialer", icon: ["ion", "call-outline"], route: "/(tabs)/dialer" },
  { key: "contacts", label: "Contacts", icon: ["ion", "person-outline"], route: "/(tabs)/contacts" },
  { key: "call-logs", label: "Call Logs", icon: ["ion", "time-outline"], route: "/(tabs)/call-logs" },
  { key: "voicemails", label: "Voicemails", icon: ["mc", "voicemail"], route: "/voicemails", badge: "5" },
  { key: "sms", label: "SMS", icon: ["ion", "chatbubble-outline"], route: "/sms", badge: "New" },
  { key: "recordings", label: "Recordings", icon: ["ion", "mic-outline"], route: "/recordings" },
  { key: "reports", label: "Reports", icon: ["ion", "bar-chart-outline"], route: "/reports" },
];

const MANAGE: MenuItem[] = [
  { key: "sip", label: "SIP Accounts", icon: ["mc", "server"], route: "/sip-accounts" },
  { key: "extensions", label: "Extensions", icon: ["ion", "people-outline"], route: "/extensions" },
  { key: "number", label: "Number", icon: ["ion", "call-outline"], route: "/numbers" },
  { key: "ivr", label: "IVR", icon: ["mc", "sitemap"], route: "/ivr" },
  { key: "plans", label: "Plans", icon: ["ion", "ribbon-outline"], route: "/plans" },
  { key: "billing", label: "Billing", icon: ["ion", "card-outline"], route: "/billing" },
];

const SUPPORT: MenuItem[] = [
  { key: "help", label: "Help & Support", icon: ["ion", "help-circle-outline"], route: "/support" },
  { key: "notifications", label: "Notifications", icon: ["ion", "notifications-outline"], route: "/notifications", badge: "3" },
];

function Icon({ icon, size, color }: { icon: any; size: number; color: string }) {
  const [family, name] = icon;
  if (family === "mc") return <MaterialCommunityIcons name={name} size={size} color={color} />;
  return <Ionicons name={name} size={size} color={color} />;
}

export default function Sidebar({
  visible,
  onClose,
  active,
}: {
  visible: boolean;
  onClose: () => void;
  active?: string;
}) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { mode, toggle } = useThemeMode();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { status, connect } = useSipEngine();

  const regFailed = status === "registration_failed" || status === "error";

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

  const initials = (user?.name || "App Device Test")
    .replace(/[^A-Za-z ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const renderItem = (item: MenuItem) => {
    const isActive = active === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.item, isActive && styles.itemActive]}
        onPress={() => go(item.route)}
        testID={`sidebar-item-${item.key}`}
      >
        <Icon icon={item.icon} size={20} color={isActive ? c.primary : c.muted} />
        <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{item.label}</Text>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} testID="sidebar-backdrop" />
      </Animated.View>
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slide }] }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 18 }}>
            <BrandLockup size={32} />
          </View>

          {/* Account card */}
          <TouchableOpacity style={styles.userCard} onPress={() => go("/profile")} testID="sidebar-user">
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || "AD"}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || "App Device Test"}
              </Text>
              <Text style={styles.userSub} numberOfLines={1}>
                <Text style={styles.userExt}>Ext 1001</Text> · Line 1
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={c.muted} />
          </TouchableOpacity>

          {regFailed && (
            <View style={styles.regBanner} testID="sidebar-reg-failed">
              <View style={styles.regDot} />
              <Text style={styles.regText}>Registration failed</Text>
              <TouchableOpacity onPress={() => { connect(); }} testID="sidebar-reg-retry">
                <Text style={styles.regRetry}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>MAIN</Text>
          {MAIN.map(renderItem)}

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>MANAGE</Text>
          {MANAGE.map(renderItem)}

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>SUPPORT</Text>
          {SUPPORT.map(renderItem)}

          <View style={styles.divider} />
          <TouchableOpacity style={styles.item} onPress={doLogout} testID="sidebar-logout">
            <Ionicons name="log-out-outline" size={20} color={c.danger} />
            <Text style={[styles.itemText, styles.logoutText]}>Log out</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <Text style={styles.footerText}>v2.5.0</Text>
          <TouchableOpacity style={styles.themeBtn} onPress={toggle} testID="sidebar-theme-toggle">
            <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={15} color={c.muted} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.drawerScrim },
    drawer: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: DRAWER_W,
      backgroundColor: c.bgElev,
      borderRightWidth: 1,
      borderRightColor: c.border,
    },
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: c.primary, fontSize: 15, fontWeight: "700" },
    userName: { color: c.text, fontSize: 14.5, fontWeight: "600" },
    userSub: { color: c.muted, fontSize: 12, marginTop: 2 },
    userExt: { color: c.primary, fontWeight: "600" },
    regBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginTop: 8,
      paddingVertical: 9,
      paddingHorizontal: 11,
      borderRadius: 10,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.dangerBorder,
    },
    regDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.danger },
    regText: { flex: 1, color: c.danger, fontSize: 12, fontWeight: "600" },
    regRetry: { color: c.danger, fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    sectionLabel: {
      color: c.dim,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.3,
      marginBottom: 6,
      marginLeft: 12,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    itemActive: { backgroundColor: c.primarySoft },
    itemText: { flex: 1, color: c.text, fontSize: 14.5, fontWeight: "500" },
    itemTextActive: { color: c.primary, fontWeight: "600" },
    logoutText: { color: c.danger, fontWeight: "600" },
    badge: {
      backgroundColor: c.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 7,
    },
    badgeText: { color: c.onPrimary, fontSize: 10, fontWeight: "700" },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    footerText: { color: c.dim, fontSize: 11.5 },
    themeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
  });
