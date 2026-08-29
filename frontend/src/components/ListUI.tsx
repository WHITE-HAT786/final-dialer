import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cardShadow, CONTROL_H, useTheme, useThemedStyles, type Palette } from "@/src/theme";

type StatusColor = { bg: string; fg: string; border: string };

export function statusColors(c: Palette): Record<string, StatusColor> {
  const ok = { bg: c.successSoft, fg: c.success, border: c.successBorder };
  const warn = { bg: c.warnSoft, fg: c.warn, border: c.warnBorder };
  const bad = { bg: c.dangerSoft, fg: c.danger, border: c.dangerBorder };
  return {
    Active: ok,
    Paid: ok,
    Inactive: warn,
    "In Use": warn,
    Unpaid: warn,
    Disabled: bad,
    Overdue: bad,
  };
}

/** v2 shows state as a tinted pill, never as coloured body text. */
export function StatusPill({ status }: { status: string }) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const s = statusColors(c)[status] || { bg: c.card, fg: c.muted, border: c.border };
  return (
    <View style={[styles.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View style={[styles.pillDot, { backgroundColor: s.fg }]} />
      <Text style={[styles.pillText, { color: s.fg }]}>{status}</Text>
    </View>
  );
}

export function FourStatCard({
  stats,
}: {
  stats: { label: string; value: any; color: string; icon: string; sub?: string; percent?: string }[];
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.statRow}>
      {stats.map((s, i) => (
        <View key={i} style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: s.color + "22" }]}>
            <Ionicons name={s.icon as any} size={16} color={s.color} />
          </View>
          <Text style={styles.statLabel}>{s.label}</Text>
          <Text style={styles.statValue}>{s.value}</Text>
          {s.percent && <Text style={[styles.statSub, { color: s.color }]}>{s.percent}</Text>}
          {s.sub && !s.percent && <Text style={styles.statSub}>{s.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

export function SearchRow({ placeholder, value, onChange, right }: any) {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.searchRow}>
      <View style={styles.search}>
        <Ionicons name="search" size={17} color={c.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={c.dim}
          value={value}
          onChangeText={onChange}
        />
      </View>
      {right}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    pillDot: { width: 6, height: 6, borderRadius: 3 },
    pillText: { fontSize: 10.5, fontWeight: "700" },

    statRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    statCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow(c),
    },
    statIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    statLabel: { color: c.muted, fontSize: 11, marginTop: 8 },
    statValue: { color: c.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
    statSub: { color: c.dim, fontSize: 10, marginTop: 2 },

    searchRow: { flexDirection: "row", gap: 8, marginTop: 14 },
    search: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      height: CONTROL_H,
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 14, padding: 0 },
  });
