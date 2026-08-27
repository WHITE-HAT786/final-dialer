// Call Logs — implements the "Call logs" frame of DepthRoute App v2.
//
// Design changes: the tab strip sits on a full-width rule with a 2px inset
// underline, filters are 32px pills rather than boxy chips, stat cards lead
// with a small glyph chip beside the label, and the rows live inside ONE card
// instead of each being its own.
//
// The frame also shows "Today" and "All lines" filter pills. Those are not
// implemented here: nothing behind them exists yet, and a control that looks
// live but does nothing is worse than no control. The two filters that do
// exist keep their places, restyled.
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { cardShadow, spacing, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";
import { makeThemedStyles } from "@/src/theme/useThemedStyles";
import { screensApi } from "@/src/api";

const TABS = ["All", "Incoming", "Outgoing", "Missed"];

/** Soft tints, per the design — the legacy solid dims read as blocks on light. */
const statIcon = (icon: string, colors: Palette) => {
  if (icon === "outgoing") return { color: colors.green, bg: colors.greenSoft, name: "arrow-up" };
  if (icon === "incoming") return { color: colors.primary, bg: colors.primarySoft, name: "arrow-down" };
  if (icon === "missed") return { color: colors.red, bg: colors.redSoft, name: "close" };
  return { color: colors.primary, bg: colors.primarySoft, name: "call" };
};

export default function CallLogs() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    screensApi.callLogs().then(setData).catch(() => setData({ items: [], page: 1, limit: 25, total: 0 }));
  }, []);

  const items = (data?.items ?? []).filter((c: any) => {
    const matchTab =
      active === "All" ||
      (active === "Incoming" && c.type === "incoming") ||
      (active === "Outgoing" && c.type === "outgoing") ||
      (active === "Missed" && c.type === "missed");
    const matchQ =
      !q ||
      String(c.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      String(c.number ?? "").includes(q);
    return matchTab && matchQ;
  });

  return (
    <Screen title="Call Logs" activeKey="call-logs">
      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={styles.tab}
            onPress={() => setActive(t)}
            testID={`calllogs-tab-${t}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active === t }}
          >
            <Text style={[styles.tabLabel, active === t && styles.tabLabelActive]}>{t}</Text>
            {active === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter pills */}
      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>All SIP Accounts</Text>
          <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
        </View>
        <View style={[styles.pill, styles.pillOn]}>
          <Ionicons name="funnel-outline" size={12} color={colors.primary} />
          <Text style={[styles.pillText, styles.pillTextOn]}>Filter</Text>
        </View>
      </View>

      {/* Stats */}
      {Array.isArray((data as any)?.stats) && (
        <View style={styles.statsRow}>
          {(data as any).stats.map((s: any, i: number) => {
            const si = statIcon(s.icon, colors);
            return (
              <View key={i} style={styles.statCard} testID={`calllog-stat-${i}`}>
                <View style={styles.statHead}>
                  <View style={[styles.statIcon, { backgroundColor: si.bg }]}>
                    <Ionicons name={si.name as any} size={11} color={si.color} />
                  </View>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={[styles.statChange, { color: s.positive ? colors.green : colors.red }]}>
                  {s.positive ? "↑" : "↓"} {s.change}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search calls"
            placeholderTextColor={colors.textDim}
            value={q}
            onChangeText={setQ}
            testID="calllogs-search"
          />
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="download-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {!data ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.listCard}>
          {items.map((c: any, i: number) => {
            const si = statIcon(c.type, colors);
            const durColor = c.type === "missed" ? colors.red : colors.green;
            const typeLabel =
              c.type === "outgoing"
                ? "Outgoing Call"
                : c.type === "incoming"
                ? "Incoming Call"
                : "Missed Call";
            return (
              <View
                key={c.id}
                style={[styles.callRow, i !== items.length - 1 && styles.callRowDivider]}
                testID={`calllog-row-${i}`}
              >
                <View style={[styles.callIcon, { backgroundColor: si.bg }]}>
                  <Ionicons name={si.name as any} size={15} color={si.color} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.callName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.callNumber}>{c.number}</Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.callType, { color: si.color }]}>{typeLabel}</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.trunk} numberOfLines={1}>{c.trunk}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.callTime}>{c.time}</Text>
                  <Text style={[styles.callDur, { color: durColor }]}>{c.duration}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeThemedStyles((colors, dark) => {
  const lift = cardShadow(dark);
  return StyleSheet.create({
    tabsRow: {
      flexDirection: "row",
      gap: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginTop: 10,
    },
    tab: { paddingVertical: 11, paddingHorizontal: 12, position: "relative" },
    tabLabel: { color: colors.textMuted, fontSize: 13.5, fontWeight: "500" },
    tabLabelActive: { color: colors.primary, fontWeight: "700" },
    tabUnderline: {
      position: "absolute",
      bottom: -1,
      left: 12,
      right: 12,
      height: 2,
      backgroundColor: colors.primary,
      borderRadius: 1,
    },

    pillRow: { flexDirection: "row", gap: 7, marginTop: 14 },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: 32,
      paddingHorizontal: 11,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    pillText: { color: colors.text, fontSize: 12, fontWeight: "500" },
    pillTextOn: { color: colors.primary, fontWeight: "600" },

    statsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    statCard: {
      flex: 1,
      padding: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...(lift ?? null),
    },
    statHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    statIcon: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    statLabel: { color: colors.textMuted, fontSize: 11.5, flexShrink: 1 },
    statValue: { color: colors.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.4, marginTop: 7 },
    statChange: { fontSize: 10.5, fontWeight: "600", marginTop: 2 },

    searchRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    search: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      backgroundColor: colors.input,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 42,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 13 },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },

    listCard: {
      marginTop: spacing.md,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      ...(lift ?? null),
    },
    callRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
    callRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
    callIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    callName: { color: colors.text, fontSize: 14, fontWeight: "600" },
    callNumber: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
    metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textDim },
    callType: { fontSize: 11, fontWeight: "500" },
    trunk: { color: colors.textDim, fontSize: 11, flexShrink: 1 },
    callTime: { color: colors.textDim, fontSize: 11 },
    callDur: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  });
});
