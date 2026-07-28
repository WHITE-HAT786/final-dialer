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
import { colors, spacing } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";
import { useSipEngine } from "@/src/sip/SipEngineContext";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(SCREEN_W * 0.82, 340);

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
  { key: "extensions", label: "Extensions", icon: ["ion", "people"], route: "/extensions" },
  { key: "number", label: "Number", icon: ["ion", "call-outline"], route: "/numbers" },
  { key: "ivr", label: "IVR", icon: ["mc", "sitemap"], route: "/ivr" },
  { key: "plans", label: "Plans", icon: ["ion", "ribbon"], route: "/plans" },
  { key: "billing", label: "Billing", icon: ["ion", "wallet"], route: "/billing" },
];

const SUPPORT: MenuItem[] = [
  { key: "help", label: "Help & Support", icon: ["ion", "help-circle"], route: "/support" },
  { key: "notifications", label: "Notifications", icon: ["ion", "notifications"], route: "/notifications", badge: "3" },
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { status } = useSipEngine();
  const sipLabel =
    status === "registered" ? { text: "SIP Registered", color: colors.green } :
    status === "connecting" ? { text: "Connecting…", color: colors.yellow } :
    status === "registration_failed" ? { text: "Registration Failed", color: colors.red } :
    status === "unsupported" ? { text: "SIP Unsupported", color: colors.yellow } :
    status === "error" ? { text: "SIP Error", color: colors.red } :
    status === "unregistered" ? { text: "Unregistered", color: colors.textMuted } :
    { text: "Disconnected", color: colors.textMuted };
  const slide = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: visible ? 0 : -DRAWER_W,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, { toValue: visible ? 1 : 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 200);
  };

  const doLogout = async () => {
    onClose();
    await logout();
    router.replace("/login");
  };

  const renderItem = (item: MenuItem) => {
    const isActive = active === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.item, isActive && styles.itemActive]}
        onPress={() => go(item.route)}
        testID={`sidebar-item-${item.key}`}
      >
        <Icon icon={item.icon} size={20} color={isActive ? colors.primary : colors.textMuted} />
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
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slide }], paddingTop: insets.top + 12 },
        ]}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.brandLogo}>
              <MaterialCommunityIcons name="waveform" size={22} color="#fff" />
            </View>
            <Text style={styles.brandText}>Depth Route</Text>
          </View>

          {/* User */}
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => go("/profile")}
            testID="sidebar-user"
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name || "JD")
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user?.name || "John Doe"}</Text>
              <Text style={styles.userExt}>
                <Text style={{ color: colors.primary }}>1001</Text>{" "}
                <Text style={{ color: colors.textMuted }}>({user?.name || "John Doe"})</Text>
              </Text>
              <View style={styles.sipInline}>
                <View style={[styles.sipDot, { backgroundColor: sipLabel.color }]} />
                <Text style={[styles.sipInlineText, { color: sipLabel.color }]}>{sipLabel.text}</Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>MAIN</Text>
          {MAIN.map(renderItem)}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>MANAGE</Text>
          {MANAGE.map(renderItem)}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>SUPPORT</Text>
          {SUPPORT.map(renderItem)}

          <TouchableOpacity style={styles.item} onPress={doLogout} testID="sidebar-logout">
            <Ionicons name="log-out-outline" size={20} color={colors.red} />
            <Text style={[styles.itemText, { color: colors.red }]}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>v2.5.0</Text>
            <View style={styles.themeBtn}>
              <Ionicons name="moon" size={16} color={colors.textMuted} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: "#080F1F",
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.lg },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  userName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  userExt: { fontSize: 13, marginTop: 2 },
  sipInline: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  sipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  sipInlineText: { color: colors.green, fontSize: 12, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemActive: { backgroundColor: colors.primaryDim + "80" },
  itemText: { color: colors.textMuted, fontSize: 15, fontWeight: "500", flex: 1 },
  itemTextActive: { color: colors.primary, fontWeight: "700" },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingHorizontal: 12,
  },
  footerText: { color: colors.textDim, fontSize: 12 },
  themeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
