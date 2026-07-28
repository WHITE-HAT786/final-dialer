import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { colors, spacing } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";

type Row = {
  key: string;
  label: string;
  icon: any;
  family?: "ion" | "mc";
  route: string;
  color: string;
  bg: string;
  badge?: string;
};

const SECTIONS: { title: string; items: Row[] }[] = [
  {
    title: "COMMUNICATION",
    items: [
      { key: "voicemails", label: "Voicemails", icon: "voicemail", family: "mc", route: "/voicemails", color: colors.purple, bg: colors.purpleDim, badge: "5" },
      { key: "sms", label: "SMS", icon: "chatbubble", route: "/sms", color: colors.primary, bg: colors.primaryDim, badge: "New" },
      { key: "recordings", label: "Recordings", icon: "mic", route: "/recordings", color: colors.teal, bg: colors.tealDim },
    ],
  },
  {
    title: "MANAGE",
    items: [
      { key: "sip", label: "SIP Accounts", icon: "server", family: "mc", route: "/sip-accounts", color: colors.green, bg: colors.greenDim },
      { key: "moh", label: "Music on Hold", icon: "music-note-eighth", family: "mc", route: "/moh-settings", color: colors.pink, bg: colors.purpleDim },
      { key: "extensions", label: "Extensions", icon: "people", route: "/extensions", color: colors.purple, bg: colors.purpleDim },
      { key: "numbers", label: "Numbers", icon: "call-outline", route: "/numbers", color: colors.primary, bg: colors.primaryDim },
      { key: "ivr", label: "IVR", icon: "sitemap", family: "mc", route: "/ivr", color: colors.orange, bg: colors.orangeDim },
      { key: "plans", label: "Plans", icon: "ribbon", route: "/plans", color: colors.teal, bg: colors.tealDim },
      { key: "billing", label: "Billing", icon: "wallet", route: "/billing", color: colors.yellow, bg: colors.yellowDim },
      { key: "reports", label: "Reports", icon: "bar-chart", route: "/reports", color: colors.pink, bg: colors.purpleDim },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { key: "profile", label: "User Profile", icon: "person", route: "/profile", color: colors.primary, bg: colors.primaryDim },
      { key: "notifications", label: "Notifications", icon: "notifications", route: "/notifications", color: colors.red, bg: colors.redDim, badge: "3" },
      { key: "support", label: "Help & Support", icon: "help-circle", route: "/support", color: colors.green, bg: colors.greenDim },
    ],
  },
];

export default function More() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Screen title="More" activeKey="more">
      {/* Profile */}
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => router.push("/profile")}
        testID="more-profile-card"
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
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.rolePill, { backgroundColor: colors.primaryDim }]}>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>
                {user?.role}
              </Text>
            </View>
            <View style={[styles.rolePill, { backgroundColor: colors.greenDim }]}>
              <Text style={{ color: colors.green, fontSize: 11, fontWeight: "700" }}>Active</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {SECTIONS.map((sec) => (
        <View key={sec.title} style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>{sec.title}</Text>
          <View style={styles.sectionCard}>
            {sec.items.map((item, i) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.row,
                  i !== sec.items.length - 1 && styles.rowDivider,
                ]}
                onPress={() => router.push(item.route as any)}
                testID={`more-item-${item.key}`}
              >
                <View style={[styles.rowIcon, { backgroundColor: item.bg }]}>
                  {item.family === "mc" ? (
                    <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                  ) : (
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  )}
                </View>
                <Text style={styles.rowLabel}>{item.label}</Text>
                {item.badge && (
                  <View style={[styles.rowBadge, item.badge === "New" && { backgroundColor: colors.primary }]}>
                    <Text style={styles.rowBadgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={doLogout} testID="more-logout">
        <Ionicons name="log-out-outline" size={20} color={colors.red} />
        <Text style={{ color: colors.red, fontSize: 15, fontWeight: "700" }}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v2.5.0 • Depth Route Dialer</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  profileName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  profileEmail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, color: "#fff", fontSize: 15 },
  rowBadge: {
    backgroundColor: colors.red,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rowBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.lg,
    padding: 14,
    backgroundColor: colors.redDim + "80",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red + "40",
  },
  version: { textAlign: "center", color: colors.textDim, fontSize: 11, marginTop: 16 },
});
