import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { screensApi } from "@/src/api";
import { FourStatCard, SearchRow, StatusPill } from "@/src/components/ListUI";

export default function Extensions() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { screensApi.extensions().then(setData).catch(() => setData([])); }, []);
  const items = (data ?? []).filter((x: any) => !q || String(x.name ?? "").toLowerCase().includes(q.toLowerCase()) || String(x.extension ?? x.ext ?? "").includes(q));

  return (
    <Screen title="Extensions" activeKey="extensions" showSip={false} showBell={false}
      right={<>
        <TouchableOpacity><Ionicons name="search" size={22} color="#fff" /></TouchableOpacity>
        <TouchableOpacity><Ionicons name="funnel-outline" size={20} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={styles.addBtn}><Ionicons name="add" size={18} color="#fff" /></TouchableOpacity>
      </>}
    >
      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <>
          <FourStatCard stats={[
            { label: "Total Extensions", value: (data ?? []).length, color: colors.primary, icon: "people", sub: "All Extensions" },
            { label: "Enabled", value: (data ?? []).filter((x: any) => x.enabled).length, color: colors.green, icon: "checkmark-circle" },
            { label: "Disabled", value: (data ?? []).filter((x: any) => !x.enabled).length, color: colors.red, icon: "close-circle" },
            { label: "UDP Devices", value: (data ?? []).filter((x: any) => x.device_type === "udp" || x.device_type === "both").length, color: colors.yellow, icon: "hardware-chip-outline" },
          ]} />
          <SearchRow placeholder="Search by Extension, Name or Caller ID..." value={q} onChange={setQ}
            right={<View style={styles.sortBox}><Text style={{ color: colors.textMuted, fontSize: 11 }}>Sort By</Text><Text style={{ color: colors.text, fontWeight: "600" }}>Extension ▾</Text></View>}
          />
          {items.map((s: any) => (
            <View key={s.id} style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: s.color + "30" }]}>
                <Text style={{ color: s.color, fontWeight: "700", fontSize: 12 }}>{String(s.name ?? "?").split(" ").map((x: string) => x[0]).slice(0, 2).join("")}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ext}>{s.extension ?? s.ext}</Text>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>{s.email}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <StatusPill status={s.status} />
                <Text style={styles.meta}>Device: {s.device}</Text>
                <Text style={styles.meta}>{s.caller_id}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn}><Ionicons name="call" size={16} color={colors.primary} /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} /></TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors) => StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sortBox: { paddingHorizontal: 10, justifyContent: "center", backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  ext: { color: colors.text, fontWeight: "700", fontSize: 16 },
  name: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  callBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
}));
