import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { SearchRow, StatusPill } from "@/src/components/ListUI";

// Real shape of GET /backend/api/app/ivr (a bare array; runtime columns hidden).
type Ivr = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  enabled: boolean;
};

export default function IVR() {
  const { data, loading, error, refresh, refreshing } = useApiData<Ivr[]>(() => apiGet("/ivr"));
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const list = data ?? [];
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter((x) => x.name.toLowerCase().includes(s));
  }, [data, q]);

  return (
    <Screen title="IVR" activeKey="ivr" showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyBlock icon="git-branch-outline" title="No IVR menus" subtitle="IVR menus configured on your account will appear here." />
      ) : (
        <>
          <SearchRow placeholder="Search by IVR name..." value={q} onChange={setQ} />
          {items.map((it) => (
            <View key={it.id} style={styles.row} testID={`ivr-${it.id}`}>
              <View style={styles.icon}>
                <Ionicons name="git-branch" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{it.name}</Text>
                {it.description ? <Text style={styles.meta}>{it.description}</Text> : null}
                {it.language ? <Text style={styles.meta}>Language: {it.language}</Text> : null}
              </View>
              <StatusPill status={it.enabled ? "Active" : "Disabled"} />
            </View>
          ))}
          {items.length === 0 ? <Text style={styles.footer}>Nothing matches your search.</Text> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  name: { color: "#fff", fontWeight: "700", fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  footer: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: 16 },
});
