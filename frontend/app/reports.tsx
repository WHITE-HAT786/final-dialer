import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { fmtDate } from "@/src/utils/format";

// Real shape of GET /backend/api/app/reports (defaults to the last 30 days).
type ReportsResponse = {
  window: { from: string; to: string };
  stats: { total_calls: number; total_minutes: number; answered: number; not_answered: number };
  direction: { inbound: number; outbound: number };
  top_destinations: { to_number: string; calls: number }[];
};

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export default function Reports() {
  const { data, loading, error, refresh, refreshing } = useApiData<ReportsResponse>(() => apiGet("/reports"));

  return (
    <Screen title="Reports" activeKey="reports" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : data ? (
        <>
          <View style={styles.windowPill}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.windowText}>{fmtDate(data.window.from)} – {fmtDate(data.window.to)}</Text>
          </View>

          {data.stats.total_calls === 0 ? (
            <EmptyBlock icon="bar-chart-outline" title="No call activity" subtitle="There are no calls in this period yet." />
          ) : (
            <>
              <View style={styles.statsGrid}>
                <Stat color={colors.primary} icon="call" label="Total Calls" value={data.stats.total_calls.toLocaleString()} />
                <Stat color={colors.green} icon="time" label="Total Minutes" value={data.stats.total_minutes.toLocaleString()} />
                <Stat color={colors.teal} icon="checkmark-circle" label="Answered" value={data.stats.answered.toLocaleString()} />
                <Stat color={colors.yellow} icon="close-circle" label="Not Answered" value={data.stats.not_answered.toLocaleString()} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Calls by Direction</Text>
                {(() => {
                  const total = data.direction.inbound + data.direction.outbound;
                  return (
                    <View style={{ marginTop: 10, gap: 10 }}>
                      <DirBar label="Inbound" value={data.direction.inbound} pctv={pct(data.direction.inbound, total)} color={colors.green} />
                      <DirBar label="Outbound" value={data.direction.outbound} pctv={pct(data.direction.outbound, total)} color={colors.primary} />
                    </View>
                  );
                })()}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Top Destinations</Text>
                {data.top_destinations.length === 0 ? (
                  <Text style={styles.meta}>No outbound destinations in this period.</Text>
                ) : (
                  <>
                    <View style={styles.tableHead}>
                      <Text style={[styles.th, { flex: 2 }]}>Number</Text>
                      <Text style={[styles.th, { textAlign: "right" }]}>Calls</Text>
                    </View>
                    {data.top_destinations.map((d, i) => (
                      <View key={i} style={styles.tr}>
                        <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{d.to_number}</Text>
                        <Text style={[styles.td, { textAlign: "right" }]}>{d.calls.toLocaleString()}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function Stat({ color, icon, label, value }: { color: string; icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function DirBar({ label, value, pctv, color }: { label: string; value: number; pctv: number; color: string }) {
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={styles.meta}>{label}</Text>
        <Text style={[styles.meta, { color: "#fff" }]}>{value.toLocaleString()} ({pctv}%)</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${pctv}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  windowPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  windowText: { color: "#fff", fontSize: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  statCard: { width: "47.5%", flexGrow: 1, padding: 12, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "700" },
  card: { padding: 14, backgroundColor: colors.card, borderRadius: 14, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  track: { height: 6, backgroundColor: colors.bgAlt, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  tableHead: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 6 },
  th: { flex: 1, color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  tr: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  td: { flex: 1, color: "#fff", fontSize: 12 },
});
