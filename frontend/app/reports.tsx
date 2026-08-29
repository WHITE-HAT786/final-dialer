import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { useTheme, useThemedStyles, type Palette } from "@/src/theme";
import { apiGet } from "@/src/api";

const CHART_H = 160;

const flagEmoji: Record<string, string> = {
  US: "🇺🇸",
  IN: "🇮🇳",
  CA: "🇨🇦",
  GB: "🇬🇧",
  AU: "🇦🇺",
};

export default function Reports() {
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiGet("/reports").then(setData); }, []);

  return (
    <Screen title="Reports" activeKey="reports" showSip={false} showBell={false}
      right={<>
        <View style={styles.datePill}>
          <Ionicons name="calendar-outline" size={12} color={c.textMuted} />
          <Text style={{ color: c.text, fontSize: 11 }}>May 20 - May 26, 2024</Text>
          <Ionicons name="chevron-down" size={12} color={c.textMuted} />
        </View>
        <TouchableOpacity><Ionicons name="funnel-outline" size={20} color={c.text} /></TouchableOpacity>
      </>}
    >
      {!data ? <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /> : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
            {data.stats.map((s: any, i: number) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.icon, { backgroundColor: [c.primary, c.green, c.purple, c.yellow][i] + "22" }]}>
                  <Ionicons name={["call", "trending-up", "cash", "bar-chart"][i] as any} size={16} color={[c.primary, c.green, c.purple, c.yellow][i]} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
                  <Text style={{ color: s.positive ? c.green : c.red, fontSize: 10, fontWeight: "700" }}>
                    {s.change}
                  </Text>
                </View>
                <Text style={styles.statSub}>{s.sub}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Call Activity */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Call Activity</Text>
              <View style={styles.dropdown}>
                <Text style={{ color: c.text, fontSize: 12 }}>By Day</Text>
                <Ionicons name="chevron-down" size={12} color={c.textMuted} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={[styles.dot, { backgroundColor: c.primary }]} />
                <Text style={styles.legend}>Total Calls</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={[styles.dot, { backgroundColor: c.green }]} />
                <Text style={styles.legend}>Total Minutes</Text>
              </View>
            </View>
            {/* Simple line chart using bars */}
            <View style={{ height: CHART_H, flexDirection: "row", alignItems: "flex-end", marginTop: 20, gap: 6 }}>
              {data.call_activity.total_calls.map((v: number, i: number) => {
                const max = Math.max(...data.call_activity.total_calls);
                const max2 = Math.max(...data.call_activity.total_minutes);
                const h1 = (v / max) * CHART_H * 0.85;
                const h2 = (data.call_activity.total_minutes[i] / max2) * CHART_H * 0.85;
                return (
                  <View key={i} style={{ flex: 1, alignItems: "center", position: "relative" }}>
                    <View style={{ position: "absolute", bottom: 0, width: 4, height: h2, backgroundColor: c.green + "50", borderRadius: 2 }} />
                    <View style={{ position: "absolute", bottom: 0, width: 4, height: h1, backgroundColor: c.primary, borderRadius: 2, left: "45%" }} />
                    <View style={{ position: "absolute", top: CHART_H - h1 - 3, width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              {data.call_activity.labels.map((l: string, i: number) => (
                <Text key={i} style={{ color: c.textMuted, fontSize: 10 }}>{l}</Text>
              ))}
            </View>
          </View>

          {/* Calls by direction + Top destinations */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={[styles.card, { flex: 1, marginTop: 0 }]}>
              <Text style={styles.cardTitle}>Calls by Direction</Text>
              <View style={{ alignItems: "center", marginTop: 10 }}>
                <View style={styles.donut}>
                  <Text style={{ color: c.text, fontSize: 20, fontWeight: "700" }}>{data.direction.total.toLocaleString()}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 10 }}>Total</Text>
                </View>
              </View>
              <View style={{ marginTop: 10, gap: 6 }}>
                <LegendItem color={c.primary} label="Outbound" value={`${data.direction.outbound.toLocaleString()} (60.6%)`} />
                <LegendItem color={c.green} label="Inbound" value={`${data.direction.inbound.toLocaleString()} (29.3%)`} />
                <LegendItem color={c.yellow} label="Internal" value={`${data.direction.internal.toLocaleString()} (10.1%)`} />
              </View>
            </View>
            <View style={[styles.card, { flex: 1.4, marginTop: 0 }]}>
              <Text style={styles.cardTitle}>Top Destinations</Text>
              <View style={styles.tableHeader}>
                <Text style={styles.thCol}>Country</Text>
                <Text style={styles.th}>Calls</Text>
                <Text style={styles.th}>Minutes</Text>
                <Text style={styles.th}>Cost</Text>
              </View>
              {data.destinations.map((d: any, i: number) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.thCol, { fontSize: 11, color: c.text }]}>{flagEmoji[d.flag] || "🌐"} {d.country}</Text>
                  <Text style={styles.td}>{d.calls.toLocaleString()}</Text>
                  <Text style={styles.td}>{d.minutes.toLocaleString()}</Text>
                  <Text style={styles.td}>${d.cost.toFixed(2)}</Text>
                </View>
              ))}
              <Text style={{ textAlign: "center", color: c.primary, marginTop: 8, fontSize: 12 }}>View All</Text>
            </View>
          </View>

          {/* Call Summary table */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Call Summary</Text>
            <View style={styles.subTabs}>
              {["By Trunk", "By Source", "By Destination", "By DID"].map((t, i) => (
                <TouchableOpacity key={t}>
                  <Text style={[styles.subTab, i === 0 && { color: c.primary, borderBottomWidth: 2, borderBottomColor: c.primary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <View>
                <View style={styles.trunkHead}>
                  {["Trunk", "Total Calls", "Minutes", "Total Cost", "ASR", "ACD", "PDD"].map((h, i) => (
                    <Text key={h} style={[styles.trunkHeadCell, i === 0 && { width: 100 }]}>{h}</Text>
                  ))}
                </View>
                {data.trunks.map((t: any, i: number) => (
                  <View key={i} style={styles.trunkRow}>
                    <View style={[styles.trunkHeadCell, { width: 100, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.green }} />
                      <Text style={{ color: c.text, fontSize: 11 }}>{t.trunk}</Text>
                    </View>
                    <Text style={styles.trunkCell}>{t.calls.toLocaleString()}</Text>
                    <Text style={styles.trunkCell}>{t.minutes.toLocaleString()}</Text>
                    <Text style={styles.trunkCell}>${t.cost.toFixed(2)}</Text>
                    <Text style={styles.trunkCell}>{t.asr}%</Text>
                    <Text style={styles.trunkCell}>{t.acd}</Text>
                    <Text style={styles.trunkCell}>{t.pdd}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 }}>
              <Ionicons name="stats-chart" size={14} color={c.primary} />
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: "600" }}>View Full Report</Text>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

function LegendItem({ color, label, value }: any) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: c.muted, fontSize: 11, flex: 1 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 11 }}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    datePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: c.card, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    statCard: { padding: 12, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, minWidth: 150 },
    icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    statLabel: { color: c.textMuted, fontSize: 11, marginTop: 6 },
    statValue: { color: c.text, fontSize: 20, fontWeight: "700" },
    statSub: { color: c.textDim, fontSize: 10, marginTop: 2 },
    card: { padding: 14, backgroundColor: c.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: c.border },
    cardTitle: { color: c.text, fontWeight: "700", fontSize: 14 },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    dropdown: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: c.bgAlt, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    legend: { color: c.textMuted, fontSize: 11 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    donut: { width: 110, height: 110, borderRadius: 55, borderWidth: 12, borderColor: c.primary, alignItems: "center", justifyContent: "center" },
    tableHeader: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    thCol: { flex: 1.4, color: c.textMuted, fontSize: 10, fontWeight: "600" },
    th: { flex: 1, color: c.textMuted, fontSize: 10, textAlign: "right", fontWeight: "600" },
    tr: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    td: { flex: 1, color: c.text, fontSize: 11, textAlign: "right" },
    subTabs: { flexDirection: "row", gap: 16, marginTop: 10, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 4 },
    subTab: { color: c.textMuted, fontSize: 12, paddingBottom: 6 },
    trunkHead: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    trunkHeadCell: { color: c.textMuted, fontSize: 10, width: 80, paddingHorizontal: 4 },
    trunkRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
    trunkCell: { color: c.text, fontSize: 11, width: 80, paddingHorizontal: 4 },
  });
