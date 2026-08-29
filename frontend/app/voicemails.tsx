import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "@/src/components/Screen";
import { colors } from "@/src/theme";
import { apiGet } from "@/src/api";
import { useApiData } from "@/src/hooks/useApiData";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/src/components/DataStates";
import { fmtDateTime, fmtDuration, initials } from "@/src/utils/format";

// Real shape of GET /backend/api/app/voicemails (file_path is never exposed, so
// there is no in-app playback source — metadata only).
type Voicemail = {
  id: number;
  from_number: string | null;
  caller_name: string | null;
  duration: number | null;
  is_read: boolean;
  created_at: string | null;
};
type VoicemailsResponse = { items: Voicemail[] };

export default function Voicemails() {
  const { data, loading, error, refresh, refreshing } = useApiData<VoicemailsResponse>(() => apiGet("/voicemails"));

  return (
    <Screen title="Voicemails" activeKey="voicemails" showBack showSip={false} showBell={false} onRefresh={refresh} refreshing={refreshing}>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyBlock icon="recording-outline" title="No voicemails" subtitle="New voicemails will appear here." />
      ) : (
        data!.items.map((v) => {
          const name = v.caller_name || v.from_number || "Unknown";
          return (
            <View key={v.id} style={styles.card} testID={`vm-${v.id}`}>
              <View style={[styles.avatar, { backgroundColor: colors.purpleDim }]}>
                <Text style={{ color: colors.purple, fontWeight: "700", fontSize: 15 }}>{initials(name)}</Text>
                {!v.is_read && <View style={styles.newDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={styles.name}>{name}</Text>
                  {!v.is_read && <View style={styles.newPill}><Text style={styles.newPillText}>New</Text></View>}
                </View>
                {v.from_number && v.caller_name ? <Text style={styles.meta}>{v.from_number}</Text> : null}
                <Text style={styles.meta}>{fmtDateTime(v.created_at)} · {fmtDuration(v.duration)}</Text>
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.card, borderRadius: 14, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", position: "relative" },
  newDot: { position: "absolute", right: -2, top: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  name: { color: "#fff", fontWeight: "700", fontSize: 15 },
  newPill: { backgroundColor: colors.purpleDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newPillText: { color: colors.purple, fontSize: 10, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
});
