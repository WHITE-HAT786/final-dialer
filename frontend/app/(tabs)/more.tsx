import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { cardShadow, spacing, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";

type Accent = "primary" | "success" | "warn" | "danger" | "purple" | "teal" | "orange" | "pink";

type Row = {
  key: string;
  label: string;
  icon: any;
  family?: "ion" | "mc";
  route: string;
  accent: Accent;
  badge?: string;
};

const SECTIONS: { title: string; items: Row[] }[] = [
  {
    title: "COMMUNICATION",
    items: [
      { key: "voicemails", label: "Voicemails", icon: "voicemail", family: "mc", route: "/voicemails", accent: "purple", badge: "5" },
      { key: "sms", label: "SMS", icon: "chatbubble-outline", route: "/sms", accent: "primary", badge: "New" },
      { key: "recordings", label: "Recordings", icon: "mic-outline", route: "/recordings", accent: "teal" },
    ],
  },
  {
    title: "MANAGE",
    items: [
      { key: "sip", label: "SIP Accounts", icon: "server", family: "mc", route: "/sip-accounts", accent: "success" },
      { key: "moh", label: "Music on Hold", icon: "music-note-eighth", family: "mc", route: "/moh-settings", accent: "pink" },
      { key: "extensions", label: "Extensions", icon: "people-outline", route: "/extensions", accent: "purple" },
      { key: "numbers", label: "Numbers", icon: "call-outline", route: "/numbers", accent: "primary" },
      { key: "ivr", label: "IVR", icon: "sitemap", family: "mc", route: "/ivr", accent: "orange" },
      { key: "plans", label: "Plans", icon: "ribbon-outline", route: "/plans", accent: "teal" },
      { key: "billing", label: "Billing", icon: "card-outline", route: "/billing", accent: "warn" },
      { key: "reports", label: "Reports", icon: "bar-chart-outline", route: "/reports", accent: "pink" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { key: "profile", label: "User Profile", icon: "person-outline", route: "/profile", accent: "primary" },
      { key: "notifications", label: "Notifications", icon: "notifications-outline", route: "/notifications", accent: "danger", badge: "3" },
      { key: "support", label: "Help & Support", icon: "help-circle-outline", route: "/support", accent: "success" },
    ],
  },
];

function accentColors(c: Palette, a: Accent) {
  switch (a) {
    case "success": return { fg: c.success, bg: c.successSoft };
    case "warn": return { fg: c.warn, bg: c.warnSoft };
    case "danger": return { fg: c.danger, bg: c.dangerSoft };
    case "purple": return { fg: c.purple, bg: c.purpleSoft };
    case "teal": return { fg: c.teal, bg: c.tealSoft };
    case "orange": return { fg: c.orange, bg: c.orangeSoft };
    case "pink": return { fg: c.pink, bg: c.purpleSoft };
    default: return { fg: c.primary, bg: c.primarySoft };
  }
}

export default function More() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { user, logout } = useAuth();

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const initials = (user?.name || "AD")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <Screen title="More" activeKey="more">
      <TouchableOpacity style={styles.profileCard} onPress={() => router.push("/profile")} testID="more-profile-card">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.profileName} numberOfLines={1}>{user?.name}</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.rolePill, { backgroundColor: c.primarySoft, borderColor: c.primaryBorder }]}>
              <Text style={[styles.rolePillText, { color: c.primary }]}>{user?.role}</Text>
            </View>
            <View style={[styles.rolePill, { backgroundColor: c.successSoft, borderColor: c.successBorder }]}>
              <Text style={[styles.rolePillText, { color: c.success }]}>Active</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </TouchableOpacity>

      {SECTIONS.map((sec) => (
        <View key={sec.title} style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>{sec.title}</Text>
          <View style={styles.sectionCard}>
            {sec.items.map((item, i) => {
              const t = accentColors(c, item.accent);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.row, i !== sec.items.length - 1 && styles.rowDivider]}
                  onPress={() => router.push(item.route as any)}
                  testID={`more-item-${item.key}`}
                >
                  <View style={[styles.rowIcon, { backgroundColor: t.bg }]}>
                    {item.family === "mc" ? (
                      <MaterialCommunityIcons name={item.icon} size={19} color={t.fg} />
                    ) : (
                      <Ionicons name={item.icon} size={19} color={t.fg} />
                    )}
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  {item.badge && (
                    <View style={styles.rowBadge}>
                      <Text style={styles.rowBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={17} color={c.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={doLogout} testID="more-logout">
        <Ionicons name="log-out-outline" size={20} color={c.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v2.5.0 • Depth Route Dialer</Text>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: c.primary, fontSize: 19, fontWeight: "700" },
    profileName: { color: c.text, fontSize: 16, fontWeight: "700" },
    profileEmail: { color: c.muted, fontSize: 12, marginTop: 2 },
    badgeRow: { flexDirection: "row", gap: 6, marginTop: 6 },
    rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
    rolePillText: { fontSize: 10.5, fontWeight: "700" },

    sectionTitle: {
      color: c.dim,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.3,
      marginBottom: 8,
      marginLeft: 4,
    },
    sectionCard: {
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      ...cardShadow(c),
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowLabel: { flex: 1, color: c.text, fontSize: 14.5, fontWeight: "500" },
    rowBadge: { backgroundColor: c.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
    rowBadgeText: { color: c.onPrimary, fontSize: 10, fontWeight: "700" },

    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: spacing.lg,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.dangerBorder,
    },
    logoutText: { color: c.danger, fontSize: 15, fontWeight: "700" },
    version: { textAlign: "center", color: c.dim, fontSize: 11, marginTop: 16 },
  });
