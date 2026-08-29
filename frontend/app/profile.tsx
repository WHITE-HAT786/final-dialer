import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock } from "@/src/components/DataStates";
import { fmtDate, fmtDateTime, initials } from "@/src/utils/format";

// Real shape of GET /backend/api/app/profile (flat; password never returned).
type Profile = {
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  member_since: string | null;
  last_login: string | null;
};

const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "");

export default function ProfileScreen() {
  const { data, loading, error, refresh, refreshing } = useApiData<Profile>(() => apiGet("/profile"));
  const { logout } = useAuth();
  const router = useRouter();

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Screen title="User Profile" activeKey="profile" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : data ? (
        <>
          <View style={styles.headerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(data.full_name || data.username)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{data.full_name || data.username}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {data.role ? (
                  <View style={[styles.pill, { backgroundColor: colors.primaryDim }]}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>{cap(data.role)}</Text>
                  </View>
                ) : null}
                {data.status ? (
                  <View style={[styles.pill, { backgroundColor: colors.greenDim }]}>
                    <Text style={{ color: colors.green, fontSize: 11, fontWeight: "700" }}>{cap(data.status)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Ionicons name="person" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Account Information</Text>
            </View>
            <Row icon="person-outline" label="Full Name" value={data.full_name} />
            <Row icon="finger-print-outline" label="Username" value={data.username} />
            <Row icon="mail-outline" label="Email" value={data.email} />
            <Row icon="call-outline" label="Phone" value={data.phone || "—"} />
            <Row icon="shield-outline" label="Role" value={cap(data.role)} />
            <Row icon="checkmark-circle-outline" label="Status" value={cap(data.status)} valueColor={colors.green} />
            <Row icon="calendar-outline" label="Member Since" value={fmtDate(data.member_since)} />
            <Row icon="time-outline" label="Last Login" value={fmtDateTime(data.last_login)} last />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={doLogout} testID="profile-logout">
            <Ionicons name="log-out-outline" size={18} color={colors.red} />
            <Text style={{ color: colors.red, fontWeight: "700", fontSize: 15 }}>Log Out</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </Screen>
  );
}

function Row({ icon, label, value, valueColor, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: { flexDirection: "row", gap: 14, alignItems: "center", padding: 14, backgroundColor: colors.card, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "700" },
  name: { color: "#fff", fontWeight: "700", fontSize: 20 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  section: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sectionTitle: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowLabel: { color: colors.textMuted, fontSize: 13, flex: 1 },
  rowValue: { color: "#fff", fontSize: 13, fontWeight: "600", maxWidth: "55%" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, padding: 14, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.red + "40" },
});
