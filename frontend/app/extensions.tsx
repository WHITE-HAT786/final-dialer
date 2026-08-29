import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { SearchRow, StatusPill } from "@/src/components/ListUI";
import { initials } from "@/src/utils/format";

// Real shape of GET /backend/api/app/extensions (a bare array; no stats block).
type Extension = {
  id: number;
  extension: string;
  name: string;
  device_type: string;      // 'web' | 'udp' | 'both'
  caller_id: string | null;
  enabled: boolean;
};

const ACCENT = ["#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#14B8A6", "#EC4899"];

export default function Extensions() {
  const { data, loading, error, refresh, refreshing } = useApiData<Extension[]>(() => apiGet("/extensions"));
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const list = data ?? [];
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter((x) => x.name.toLowerCase().includes(s) || x.extension.includes(q) || (x.caller_id || "").includes(q));
  }, [data, q]);

  return (
    <Screen title="Extensions" activeKey="extensions" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyBlock icon="people-outline" title="No extensions yet" subtitle="Your administrator assigns extensions to your account." />
      ) : (
        <>
          <SearchRow placeholder="Search by extension, name or caller ID..." value={q} onChange={setQ} />
          {items.map((s, i) => {
            const color = ACCENT[i % ACCENT.length];
            return (
              <View key={s.id} style={styles.row} testID={`ext-${s.id}`}>
                <View style={[styles.avatar, { backgroundColor: color + "30" }]}>
                  <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{initials(s.name || s.extension)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ext}>{s.extension}</Text>
                  {s.name ? <Text style={styles.name}>{s.name}</Text> : null}
                  {s.caller_id ? <Text style={styles.meta}>Caller ID: {s.caller_id}</Text> : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <StatusPill status={s.enabled ? "Active" : "Disabled"} />
                  <Text style={styles.meta}>Device: {s.device_type.toUpperCase()}</Text>
                </View>
              </View>
            );
          })}
          {items.length === 0 ? <Text style={styles.footer}>Nothing matches your search.</Text> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  ext: { color: "#fff", fontWeight: "700", fontSize: 16 },
  name: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  footer: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: 16 },
});
