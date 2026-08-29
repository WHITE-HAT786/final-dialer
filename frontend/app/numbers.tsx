import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { SearchRow, StatusPill } from "@/src/components/ListUI";

// Real shape of GET /backend/api/app/numbers.
type PhoneNumber = {
  id: number;
  number: string;
  type: string | null;
  location: string | null;
  country_name: string | null;
  status: string | null;
};
type NumbersResponse = { numbers: PhoneNumber[]; stats: { total: number; active: number } };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Numbers() {
  const { data, loading, error, refresh, refreshing } = useApiData<NumbersResponse>(() => apiGet("/numbers"));
  const [q, setQ] = useState("");
  const [active, setActive] = useState("All");

  const numbers = useMemo(() => data?.numbers ?? [], [data]);
  const types = useMemo(() => {
    const set = new Set<string>();
    numbers.forEach((n) => n.type && set.add(n.type));
    return ["All", ...Array.from(set)];
  }, [numbers]);

  const items = useMemo(() => {
    return numbers.filter((n) => {
      const matchTab = active === "All" || n.type === active;
      const s = q.toLowerCase();
      const matchQ = !q || n.number.includes(q) || (n.location || "").toLowerCase().includes(s) || (n.country_name || "").toLowerCase().includes(s);
      return matchTab && matchQ;
    });
  }, [numbers, q, active]);

  return (
    <Screen title="Numbers" activeKey="numbers" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : numbers.length === 0 ? (
        <EmptyBlock icon="call-outline" title="No numbers yet" subtitle="Phone numbers assigned to your account will appear here." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data!.stats.total}</Text>
              <Text style={styles.statLabel}>Total Numbers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.green }]}>{data!.stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>

          <SearchRow placeholder="Search by number, city or country..." value={q} onChange={setQ} />

          {types.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
              {types.map((t) => (
                <TouchableOpacity key={t} onPress={() => setActive(t)} style={[styles.tab, active === t && styles.tabActive]}>
                  <Text style={[styles.tabLabel, active === t && { color: colors.primary, fontWeight: "700" }]}>{cap(t)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {items.map((n) => (
            <View key={n.id} style={styles.row} testID={`number-${n.id}`}>
              <View style={styles.icon}>
                <Ionicons name="call" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{n.number}</Text>
                {n.location ? <Text style={styles.meta}>{n.location}</Text> : null}
                {n.country_name ? <Text style={styles.meta}>{n.country_name}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                {n.status ? <StatusPill status={cap(n.status)} /> : null}
                {n.type ? <Text style={styles.meta}>Type: {cap(n.type)}</Text> : null}
              </View>
            </View>
          ))}
          <Text style={styles.footer}>Showing {items.length} of {data!.stats.total} numbers</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  statCard: { flex: 1, padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: colors.primary },
  tabLabel: { color: colors.textMuted, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  name: { color: "#fff", fontWeight: "700", fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  footer: { textAlign: "center", color: colors.textMuted, fontSize: 11, marginTop: 12 },
});
