import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors, spacing } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { fmtDateTime, fmtDuration } from "@/src/utils/format";

// Real shape of GET /backend/api/app/call-logs. recording_url is never exposed —
// only has_recording. direction is the stored enum ('incoming'|'outgoing'|'missed').
type CallLog = {
  call_uuid: string;
  direction: string;
  from_number: string;
  to_number: string;
  extension: string | null;
  status: string;
  duration_sec: number | null;
  call_charge: string | null;
  started_at: string | null;
  answered_at: string | null;
  has_recording: boolean;
};
type CallLogsResponse = { items: CallLog[]; page: number; limit: number; total: number };

const TABS = ["All", "Incoming", "Outgoing", "Missed"] as const;

function typeMeta(direction: string) {
  if (direction === "outgoing") return { color: colors.green, bg: colors.greenDim, name: "arrow-up" as const, label: "Outgoing" };
  if (direction === "missed") return { color: colors.red, bg: colors.redDim, name: "close" as const, label: "Missed" };
  return { color: colors.primary, bg: colors.primaryDim, name: "arrow-down" as const, label: "Incoming" };
}

export default function CallLogs() {
  const { data, loading, error, refresh, refreshing } = useApiData<CallLogsResponse>(() => apiGet("/call-logs"));
  const [active, setActive] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const list = data?.items ?? [];
    return list.filter((c) => {
      const matchTab =
        active === "All" ||
        (active === "Incoming" && c.direction === "incoming") ||
        (active === "Outgoing" && c.direction === "outgoing") ||
        (active === "Missed" && c.direction === "missed");
      const matchQ = !q || c.from_number.includes(q) || c.to_number.includes(q);
      return matchTab && matchQ;
    });
  }, [data, active, q]);

  return (
    <Screen title="Call Logs" activeKey="call-logs" onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setActive(t)} testID={`calllogs-tab-${t}`}>
            <Text style={[styles.tabLabel, active === t && styles.tabLabelActive]}>{t}</Text>
            {active === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by number..."
          placeholderTextColor={colors.textDim}
          value={q}
          onChangeText={setQ}
          testID="calllogs-search"
        />
      </View>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyBlock icon="call-outline" title="No call records yet" subtitle="Your calls will appear here." />
      ) : items.length === 0 ? (
        <EmptyBlock icon="search-outline" title="No matching calls" />
      ) : (
        <View style={styles.listCard}>
          {items.map((c, i) => {
            const m = typeMeta(c.direction);
            const peer = c.direction === "outgoing" ? c.to_number : c.from_number;
            const durColor = c.direction === "missed" ? colors.red : colors.green;
            return (
              <View key={c.call_uuid} style={[styles.callRow, i !== items.length - 1 && styles.callRowDivider]} testID={`calllog-row-${i}`}>
                <View style={[styles.callIcon, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.name} size={16} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.callName} numberOfLines={1}>{peer || "Unknown"}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 2, alignItems: "center" }}>
                    <Text style={[styles.callType, { color: m.color }]}>{m.label}</Text>
                    {c.has_recording ? <Ionicons name="mic" size={12} color={colors.textMuted} /> : null}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.callTime}>{fmtDateTime(c.started_at)}</Text>
                  <Text style={[styles.callDur, { color: durColor }]}>{fmtDuration(c.duration_sec)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 4 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, position: "relative" },
  tabLabel: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
  tabLabelActive: { color: colors.primary, fontWeight: "700" },
  tabUnderline: { position: "absolute", bottom: -1, left: 16, right: 16, height: 2, backgroundColor: colors.primary, borderRadius: 1 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  searchInput: { flex: 1, color: "#fff", fontSize: 13 },
  listCard: { marginTop: spacing.md, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  callRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  callRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  callIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  callName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  callType: { fontSize: 11, fontWeight: "500" },
  callTime: { color: colors.textMuted, fontSize: 11 },
  callDur: { fontSize: 12, fontWeight: "600", marginTop: 2 },
});
