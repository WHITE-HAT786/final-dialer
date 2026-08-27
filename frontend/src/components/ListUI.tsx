// Shared list-screen furniture: status pill, four-up stat strip, search row.
//
// The status map used to be a module-level constant built from the dark
// palette, which froze it at import time. It is now a function of the active
// palette — each of these is a real component, so each resolves the theme
// through useTheme() rather than closing over a captured `colors`.
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cardShadow, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";

type StatusColor = { bg: string; fg: string };

/** Semantic status tints, resolved against whichever palette is active. */
function statusColors(c: Palette): Record<string, StatusColor> {
  return {
    Active: { bg: c.greenSoft, fg: c.green },
    Inactive: { bg: c.yellowSoft, fg: c.yellow },
    Disabled: { bg: c.redSoft, fg: c.red },
    "In Use": { bg: c.yellowSoft, fg: c.yellow },
    Paid: { bg: c.greenSoft, fg: c.green },
    Unpaid: { bg: c.yellowSoft, fg: c.yellow },
    Overdue: { bg: c.redSoft, fg: c.red },
  };
}

export function StatusPill({ status }: { status: string }) {
  const { colors } = useTheme();
  const c = statusColors(colors)[status] || { bg: colors.cardAlt, fg: colors.textMuted };
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: c.bg,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg }} />
      <Text style={{ color: c.fg, fontSize: 10, fontWeight: "700" }}>{status}</Text>
    </View>
  );
}

export function FourStatCard({
  stats,
}: {
  stats: { label: string; value: any; color: string; icon: string; sub?: string; percent?: string }[];
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          value={value}
          onChangeText={onChange}
        />
      </View>
      {right}
    </View>
  );
}

function makeStyles(c: Palette, dark: boolean) {
  const lift = cardShadow(dark);
  return StyleSheet.create({
    statCard: {
      flex: 1,
      padding: 10,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      ...(lift ?? null),
    },
    statIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    statLabel: { color: c.textMuted, fontSize: 11, marginTop: 6 },
    statValue: { color: c.text, fontSize: 20, fontWeight: "700" },
    statSub: { color: c.textMuted, fontSize: 10, marginTop: 2 },
    // The design gives inputs their own fill token so a light field reads as
    // a field, not as another card.
    search: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.input,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 46,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: { flex: 1, color: c.text, fontSize: 13 },
  });
}
