import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { cardShadow, useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";

const TABS = ["All", "Incoming", "Outgoing", "Missed"];

const tone = (c: Palette, type: string) => {
  if (type === "outgoing") return { fg: c.success, bg: c.successSoft, glyph: "↑", label: "Outgoing" };
  if (type === "incoming") return { fg: c.primary, bg: c.primarySoft, glyph: "↓", label: "Incoming" };
  return { fg: c.danger, bg: c.dangerSoft, glyph: "✕", label: "Missed" };
};

const statTone = (c: Palette, icon: string) => {
  if (icon === "outgoing") return { fg: c.success, bg: c.successSoft, glyph: "↑" };
  if (icon === "incoming") return { fg: c.primary, bg: c.primarySoft, glyph: "↓" };
  if (icon === "missed") return { fg: c.danger, bg: c.dangerSoft, glyph: "✕" };
  return { fg: c.primary, bg: c.primarySoft, glyph: "•" };
};

export default function CallLogs() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    apiGet("/call-logs").then(setData).catch(() => {});
  }, []);

  const items = data
    ? data.items.filter((row: any) => {
        const matchTab = active === "All" || row.type === active.toLowerCase();
        const matchQ =
          !q || row.name.toLowerCase().includes(q.toLowerCase()) || row.number.includes(q);
        return matchTab && matchQ;
      })
    : [];

  const tabStrip = (
    <View style={styles.tabStrip}>
      {TABS.map((t) => {
        const on = active === t;
        return (
          <TouchableOpacity
            key={t}
            style={styles.tab}
            onPress={() => setActive(t)}
            testID={`calllogs-tab-${t}`}
          >
            <Text style={[styles.tabLabel, on && styles.tabLabelActive]}>{t}</Text>
            <View style={[styles.tabUnderline, on && styles.tabUnderlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Screen title="Call Logs" activeKey="call-logs" hairline={false} belowHeader={tabStrip}>
      {/* Filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.pill} testID="calllogs-date">
          <Ionicons name="calendar-outline" size={14} color={c.muted} />
          <Text style={styles.pillText}>Today</Text>
          <Ionicons name="chevron-down" size={11} color={c.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} testID="calllogs-lines">
          <Text style={styles.pillText}>All lines</Text>
          <Ionicons name="chevron-down" size={11} color={c.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pill, styles.pillActive]} testID="calllogs-filter">
          <Ionicons name="funnel-outline" size={12} color={c.primary} />
          <Text style={[styles.pillText, styles.pillTextActive]}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {data && (
        <View style={styles.statsRow}>
          {data.stats.map((s: any, i: number) => {
            const t = statTone(c, s.icon);
            return (
              <View key={i} style={styles.statCard} testID={`calllog-stat-${i}`}>
                <View style={styles.statHead}>
                  <View style={[styles.statGlyph, { backgroundColor: t.bg }]}>
                    <Text style={[styles.statGlyphText, { color: t.fg }]}>{t.glyph}</Text>
                  </View>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={[styles.statChange, { color: s.positive ? c.success : c.danger }]}>
                  {s.positive ? "↑" : "↓"} {s.change}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Search + export */}
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={c.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search calls"
            placeholderTextColor={c.dim}
            value={q}
            onChangeText={setQ}
            testID="calllogs-search"
          />
        </View>
        <TouchableOpacity style={styles.exportBtn} testID="calllogs-export">
          <Ionicons name="download-outline" size={18} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Rows */}
      {!data ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <View style={styles.listCard}>
          {items.map((row: any, i: number) => {
            const t = tone(c, row.type);
            const last = i === items.length - 1;
            return (
              <View
                key={row.id}
                style={[styles.row, !last && styles.rowDivider]}
                testID={`calllog-row-${i}`}
              >
                <View style={[styles.rowGlyph, { backgroundColor: t.bg }]}>
                  <Text style={[styles.rowGlyphText, { color: t.fg }]}>{t.glyph}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowName} numberOfLines={1}>{row.name}</Text>
                  <Text style={styles.rowNumber} numberOfLines={1}>{row.number}</Text>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowType, { color: t.fg }]}>{t.label}</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.rowTrunk}>{row.trunk}</Text>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowTime}>{row.time}</Text>
                  <Text style={[styles.rowDur, { color: row.type === "missed" ? c.danger : c.success }]}>
                    {row.duration}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    tabStrip: {
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tab: { paddingVertical: 11, paddingHorizontal: 12 },
    tabLabel: { color: c.muted, fontSize: 13.5, fontWeight: "500" },
    tabLabelActive: { color: c.primary, fontWeight: "700" },
    tabUnderline: {
      position: "absolute",
      bottom: -1,
      left: 12,
      right: 12,
      height: 2,
      borderRadius: 1,
      backgroundColor: "transparent",
    },
    tabUnderlineActive: { backgroundColor: c.primary },

    filterRow: { flexDirection: "row", gap: 7, marginTop: 14 },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: 32,
      paddingHorizontal: 11,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    pillActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    pillText: { color: c.text, fontSize: 12, fontWeight: "500" },
    pillTextActive: { color: c.primary, fontWeight: "600" },

    statsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    statCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    statHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    statGlyph: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
    statGlyphText: { fontSize: 11, fontWeight: "700" },
    statLabel: { color: c.muted, fontSize: 11.5 },
    statValue: { color: c.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.4, marginTop: 7 },
    statChange: { fontSize: 10.5, fontWeight: "600", marginTop: 2 },

    searchRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    search: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      height: 42,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 13, padding: 0 },
    exportBtn: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },

    listCard: {
      marginTop: 14,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    rowGlyph: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    rowGlyphText: { fontSize: 14, fontWeight: "700" },
    rowName: { color: c.text, fontSize: 14, fontWeight: "600" },
    rowNumber: { color: c.muted, fontSize: 12, marginTop: 2 },
    rowMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
    rowType: { fontSize: 11, fontWeight: "500" },
    metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: c.dim },
    rowTrunk: { color: c.dim, fontSize: 11 },
    rowRight: { alignItems: "flex-end", gap: 2 },
    rowTime: { color: c.dim, fontSize: 11 },
    rowDur: { fontSize: 12, fontWeight: "600" },
  });
