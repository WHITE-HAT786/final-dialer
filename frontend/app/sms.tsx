import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { relTime } from "@/src/utils/format";

// Real shape of GET /backend/api/app/sms. No compose/send: there is no send
// endpoint in the app API, so no send UI is shown (no unsupported-write control).
type SmsMessage = {
  id: number;
  direction: string | null;
  from_number: string | null;
  to_number: string | null;
  body: string | null;
  status: string | null;
  created_at: string | null;
};
type SmsResponse = { items: SmsMessage[] };

const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "");

export default function SMS() {
  const { data, loading, error, refresh, refreshing } = useApiData<SmsResponse>(() => apiGet("/sms"));

  return (
    <Screen title="SMS" activeKey="sms" showSip={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyBlock icon="chatbubbles-outline" title="No messages" subtitle="SMS you send or receive will appear here." />
      ) : (
        data!.items.map((m) => {
          const outbound = (m.direction || "").toLowerCase() === "outbound" || (m.direction || "").toLowerCase() === "outgoing";
          const peer = outbound ? m.to_number : m.from_number;
          return (
            <View key={m.id} style={styles.row} testID={`sms-${m.id}`}>
              <View style={[styles.avatar, { backgroundColor: outbound ? colors.primaryDim : colors.greenDim }]}>
                <Ionicons name={outbound ? "arrow-up" : "arrow-down"} size={16} color={outbound ? colors.primary : colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.number}>{peer || "Unknown"}</Text>
                {m.body ? <Text style={styles.body} numberOfLines={2}>{m.body}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.time}>{relTime(m.created_at)}</Text>
                {m.status ? (
                  <Text style={[styles.status, { color: m.status.toLowerCase() === "delivered" ? colors.green : colors.yellow }]}>{cap(m.status)}</Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  number: { color: "#fff", fontSize: 14, fontWeight: "600" },
  body: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  time: { color: colors.textMuted, fontSize: 11 },
  status: { fontSize: 10, fontWeight: "700" },
});
