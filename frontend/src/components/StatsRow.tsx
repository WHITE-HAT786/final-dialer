import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { cardShadow, type Palette } from "@/src/theme";
import { useTheme } from "@/src/theme/ThemeContext";

type Stat = {
  label: string;
  value: string | number;
  color: string;
  icon: string;
  family?: "ion" | "mc";
  sub?: string;
  change?: string;
  positive?: boolean;
};

export default function StatsRow({ stats, horizontal = true }: { stats: Stat[]; horizontal?: boolean }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const Wrap = horizontal ? ScrollView : View;
  const wrapProps: any = horizontal
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { gap: 10, paddingRight: 8 } }
    : { style: { flexDirection: "row", flexWrap: "wrap", gap: 10 } };
  return (
    <Wrap {...wrapProps} style={{ marginTop: 12 }}>
      {stats.map((s, i) => (
        <View
          key={i}
          style={[styles.card, !horizontal && { flexBasis: "48%", flexGrow: 1 }]}
          testID={`stat-${i}`}
        >
          <View style={[styles.icon, { backgroundColor: s.color + "22" }]}>
            {s.family === "mc" ? (
              <MaterialCommunityIcons name={s.icon as any} size={18} color={s.color} />
            ) : (
              <Ionicons name={s.icon as any} size={18} color={s.color} />
            )}
          </View>
          <Text style={styles.label}>{s.label}</Text>
          <Text style={styles.value}>{s.value}</Text>
          {s.sub && (
            <Text style={[styles.sub, s.change ? { color: s.positive ? colors.green : colors.red } : undefined]}>
              {s.change ? `${s.positive ? "↑" : "↓"} ${s.change} ` : ""}
              {s.sub}
            </Text>
          )}
        </View>
      ))}
    </Wrap>
  );
}

function makeStyles(c: Palette, dark: boolean) {
  const lift = cardShadow(dark);
  return StyleSheet.create({
    card: {
      padding: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 140,
      ...(lift ?? null),
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    label: { color: c.textMuted, fontSize: 12, marginTop: 8 },
    value: { color: c.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
    sub: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  });
}
