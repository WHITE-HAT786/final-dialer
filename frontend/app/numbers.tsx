import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";
import { FourStatCard, SearchRow, StatusPill } from "@/src/components/ListUI";

const TABS = ["All", "Local", "Toll Free", "Mobile"];

export default function Numbers() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState("All");
  useEffect(() => { apiGet("/numbers").then(setData); }, []);
  const items = data ? data.items.filter((x: any) =>
    (!q || x.number.includes(q) || x.location.toLowerCase().includes(q.toLowerCase())) &&
    (active === "All" || x.type === active)
  ) : [];

  return (
    <Screen title="Numbers" activeKey="numbers" showSip={false} showBell={false}
      right={<>
        <TouchableOpacity><Ionicons name="search" size={22} color={c.text} /></TouchableOpacity>
        <TouchableOpacity><Ionicons name="funnel-outline" size={20} color={c.text} /></TouchableOpacity>
        <TouchableOpacity style={styles.addBtn}><Ionicons name="add" size={18} color="#fff" /></TouchableOpacity>
      </>}
    >
      {!data ? <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /> : (
        <>
          <FourStatCard stats={[
            { label: "Total Numbers", value: data.stats.total.toLocaleString(), color: c.primary, icon: "call", sub: "All Numbers" },
            { label: "Active", value: data.stats.active.toLocaleString(), color: c.green, icon: "checkmark-circle", percent: "87.7%" },
            { label: "In Use", value: data.stats.in_use, color: c.yellow, icon: "pause-circle", percent: "7.8%" },
            { label: "Inactive", value: data.stats.inactive, color: c.red, icon: "close-circle", percent: "4.5%" },
          ]} />
          <SearchRow placeholder="Search by Number, Country, State, City..." value={q} onChange={setQ}
            right={<View style={styles.sortBox}><Text style={{ color: c.textMuted, fontSize: 11 }}>Sort By</Text><Text style={{ color: c.text, fontWeight: "600" }}>Number ▾</Text></View>}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
            {TABS.map(t => (
              <TouchableOpacity key={t} onPress={() => setActive(t)} style={[styles.tab, active === t && styles.tabActive]}>
                <Text style={[styles.tabLabel, active === t && { color: c.primary, fontWeight: "700" }]}>
                  {t} {t === "All" ? `(${data.stats.total.toLocaleString()})` : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {items.map((n: any) => (
            <View key={n.id} style={styles.row}>
              <View style={[styles.icon, { backgroundColor: n.color + "30" }]}>
                {n.type === "Toll Free" ? (
                  <Text style={{ color: n.color, fontWeight: "700", fontSize: 12 }}>TF</Text>
                ) : (
                  <Ionicons name="call" size={18} color={n.color} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{n.number}</Text>
                <Text style={styles.meta}>🇺🇸 {n.type === "Toll Free" ? n.location : `United States 🇺🇸`}</Text>
                <Text style={styles.meta}>{n.type === "Toll Free" ? "Toll Free Number" : n.location}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <StatusPill status={n.status} />
                <Text style={styles.meta}>Type: {n.type}</Text>
                <Text style={styles.meta}>Assigned To:</Text>
                <Text style={[styles.meta, { color: c.text }]}>{n.assigned}</Text>
              </View>
              <TouchableOpacity><Ionicons name="ellipsis-vertical" size={16} color={c.textMuted} /></TouchableOpacity>
            </View>
          ))}
          <Text style={styles.footer}>Showing 1 to {items.length} of {data.stats.total.toLocaleString()} numbers</Text>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    sortBox: { paddingHorizontal: 10, justifyContent: "center", backgroundColor: c.card, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    tabActive: { borderColor: c.primary },
    tabLabel: { color: c.textMuted, fontSize: 12 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, backgroundColor: c.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: c.border },
    icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    name: { color: c.text, fontWeight: "700", fontSize: 14 },
    meta: { color: c.textMuted, fontSize: 11, marginTop: 2 },
    footer: { textAlign: "center", color: c.textMuted, fontSize: 11, marginTop: 12 },
  });
