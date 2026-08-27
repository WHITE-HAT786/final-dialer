import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { screensApi } from "@/src/api";
import { useAuth } from "@/src/AuthContext";

export default function Profile() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any>(null);
  const { logout } = useAuth();
  const router = useRouter();
  useEffect(() => { screensApi.profile().then(setData).catch(() => setData(null)); }, []);

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Screen title="User Profile" activeKey="profile" showSip={false} showBell={false}
      right={<TouchableOpacity style={styles.editBtn}>
        <Ionicons name="create-outline" size={16} color="#fff" />
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>Edit Profile</Text>
      </TouchableOpacity>}
    >
      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <>
          <View style={styles.headerCard}>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {String(data.full_name || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                </Text>
                <TouchableOpacity style={styles.camBtn}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{data.full_name}</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                  <View style={[styles.pill, { backgroundColor: colors.primaryDim }]}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>{data.role}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: colors.greenDim }]}>
                    <Text style={{ color: colors.green, fontSize: 11, fontWeight: "700" }}>{data.status}</Text>
                  </View>
                </View>
                <Text style={styles.metaLine}>{data.email}</Text>
                <Text style={styles.metaLine}>{data.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
            <View style={styles.statsRow}>
              {[].map((s: any, i: number) => (
                <View key={i} style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: s.color + "22" }]}>
                    {s.icon === "hash" ? (
                      <Text style={{ color: s.color, fontWeight: "700" }}>#</Text>
                    ) : (
                      <Ionicons name={s.icon} size={16} color={s.color} />
                    )}
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <Section title="Account Information" icon="person" color={colors.primary}>
            <Row icon="person-outline" label="Full Name" value={data.full_name} />
            <Row icon="finger-print-outline" label="Username" value={data.username} />
            <Row icon="mail-outline" label="Email Address" value={data.email} />
            <Row icon="call-outline" label="Phone Number" value={data.phone} />
            <Row icon="shield-outline" label="Role" value={data.role} />
            <Row icon="business-outline" label="Account Type" value={data.account_type} />
            <Row icon="checkmark-circle-outline" label="Status" value={data.status} valueColor={colors.green} />
            <Row icon="calendar-outline" label="Member Since" value={data.member_since} />
            <Row icon="time-outline" label="Last Login" value={data.last_login} last />
          </Section>

          <Section title="Security" icon="shield" color={colors.primary}>
            <Row icon="lock-closed-outline" label="Change Password" value="" sub="Update your account password" />
            <Row icon="shield-checkmark-outline" label="Two-Factor Authentication" value="Enabled" valueColor={colors.green} sub="Add an extra layer of security" last />
          </Section>

          <Section title="Preferences" icon="settings" color={colors.primary}>
            <Row icon="globe-outline" label="Language" value="English" />
            <Row icon="time-outline" label="Time Zone" value="(UTC-05:00) America/New_York" />
            <Row icon="calendar-outline" label="Date Format" value="MM/DD/YYYY" />
            <Row icon="notifications-outline" label="Notifications" value="Manage Preferences" last />
          </Section>

          <TouchableOpacity style={styles.logoutBtn} onPress={doLogout} testID="profile-logout">
            <Ionicons name="log-out-outline" size={18} color={colors.red} />
            <Text style={{ color: colors.red, fontWeight: "700", fontSize: 15 }}>Log Out</Text>
          </TouchableOpacity>
        </>
      )}
    </Screen>
  );
}

function Section({ title, icon, color, children }: any) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={{ color: color, fontWeight: "700", fontSize: 14 }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ icon, label, value, sub, valueColor, last }: any) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{sub}</Text>}
      </View>
      <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </View>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  headerCard: { padding: 14, backgroundColor: colors.card, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primary, fontSize: 28, fontWeight: "700" },
  camBtn: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgAlt, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card },
  name: { color: colors.text, fontWeight: "700", fontSize: 20 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaLine: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: "row", marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 4 },
  statLabel: { color: colors.textMuted, fontSize: 11 },
  section: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowLabel: { color: colors.text, fontSize: 14 },
  rowValue: { color: colors.textMuted, fontSize: 13 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, padding: 14, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.red + "40" },
}));
